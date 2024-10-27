import { Hono } from "hono";
import type { LambdaContext, LambdaEvent } from "hono/aws-lambda";
import { z } from "zod";
import { CUSTOMERS_TABLE_NAME, dynamoDBDocumentClient } from "./ddb";
import { PutCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

type Bindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

type Post = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

const posts: Post[] = [
  {
    id: "1",
    title: "Hello",
    content: "World",
    createdAt: "2021-01-01T00:00:00Z",
  },
  {
    id: "2",
    title: "Foo",
    content: "Bar",
    createdAt: "2023-01-01T00:00:00Z",
  },
  {
    id: "3",
    title: "Baz",
    content: "Qux",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const app = new Hono<{ Bindings: Bindings }>();

app.post("/posts", async (c) => {
  const body = c.env.event.body;

  const p = z
    .object({
      a: z.number(),
      b: z.number(),
    })
    .safeParse(JSON.parse(body || "{}"));

  if (!p.success) {
    return c.json(
      {
        error: "Invalid input",
        description: p.error.errors.map((e) => e.message).join(", "),
      },
      400
    );
  }

  return c.json({ result: p.data.a + p.data.b });
});

app.get("/posts", async (c) => {
  const query = c.env.event.queryStringParameters;

  const params = z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .safeParse(query);

  if (!params.success) {
    return c.json(
      {
        error: "Invalid input",
        description: params.error.errors.map((e) => e.message).join(", "),
      },
      400
    );
  }

  const filteredPosts = posts.filter((post) => {
    if (
      params.data.from &&
      new Date(post.createdAt) < new Date(params.data.from)
    ) {
      return false;
    }

    if (params.data.to && new Date(post.createdAt) > new Date(params.data.to)) {
      return false;
    }

    return true;
  });

  return c.json(filteredPosts);
});

app.get("/users/:id", async (c) => {
  const pathParameters = c.env.event.pathParameters;

  const params = z
    .object({
      id: z.string(),
    })
    .safeParse(pathParameters);

  if (!params.success) {
    return c.json(
      {
        error: "Invalid input",
        description: params.error.errors.map((e) => e.message).join(", "),
      },
      400
    );
  }

  const res = await fetch("https://example.com/user");
  const json = await res.json();

  return c.json(json);
});

app.post("/customers", async (c) => {
  const body = c.env.event.body;

  const p = z
    .object({
      firstName: z.string().regex(/^[A-Za-z]+$/),
      lastName: z.string().regex(/^[A-Za-z]+$/),
      email: z.string().email(),
    })
    .safeParse(JSON.parse(body || "{}"));

  if (!p.success) {
    return c.json(
      {
        error: "Invalid input",
        description: p.error.errors.map((e) => e.message).join(", "),
      },
      400
    );
  }

  await dynamoDBDocumentClient.send(
    new PutCommand({
      TableName: CUSTOMERS_TABLE_NAME,
      Item: {
        id: crypto.randomUUID(),
        ...p.data,
      },
    })
  );

  return c.json({});
});

app.get("/customers/:id", async (c) => {
  const pathParameters = c.env.event.pathParameters;

  const params = z
    .object({
      id: z.string().uuid(),
    })
    .safeParse(pathParameters);

  if (!params.success) {
    return c.json(
      {
        error: "Invalid input",
        description: params.error.errors.map((e) => e.message).join(", "),
      },
      400
    );
  }


  const res = await dynamoDBDocumentClient.send(
    new GetCommand({
      TableName: CUSTOMERS_TABLE_NAME,
      Key: {
        id: params.data.id,
      },
    })
  );

  if (!res.Item) {
    return c.json({ error: "Customer not found" }, 404);
  }

  return c.json(res.Item);
});

app.get("/customers", async (c) => {
  const res = await dynamoDBDocumentClient.send(
    new ScanCommand({
      TableName: CUSTOMERS_TABLE_NAME,
    })
  );

  return c.json(res.Items);
});

export default app;
