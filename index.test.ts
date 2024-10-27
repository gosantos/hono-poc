import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import app from ".";
import { CUSTOMERS_TABLE_NAME, dynamoDBDocumentClient } from "./ddb";
import {
  CreateTableCommand,
  DeleteTableCommand,
} from "@aws-sdk/client-dynamodb";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/native";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

let server: ReturnType<typeof setupServer>;
beforeAll(async () => {
  // mock server setup
  const handlers = [
    http.get("https://example.com/user", () => {
      return HttpResponse.json({
        id: "c7b3d8e0-5e0b-4b0f-8b3a-3b9f4b3d3b3d",
        firstName: "John",
        lastName: "Maverick",
      });
    }),
  ];

  server = setupServer(...handlers);
  server.listen();

  // setup dynamodb table
  await dynamoDBDocumentClient.send(
    new CreateTableCommand({
      TableName: CUSTOMERS_TABLE_NAME,
      KeySchema: [
        {
          AttributeName: "id",
          KeyType: "HASH",
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: "id",
          AttributeType: "S",
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    })
  );
});

afterAll(async () => {
  server.close();

  // cleanup dynamodb table
  await dynamoDBDocumentClient.send(
    new DeleteTableCommand({
      TableName: CUSTOMERS_TABLE_NAME,
    })
  );
});

describe.skip("POST /posts", () => {
  test("should return { result: 3 }", async () => {
    const requestBody = JSON.stringify({ a: 1, b: 2 });
    const res = await app.request(
      "/posts",
      {
        method: "POST",
      },
      {
        event: {
          body: requestBody,
        },
      }
    );

    const body = await res.json();

    expect(body).toEqual({ result: 3 });
  });

  test("should return { error: 'Invalid input', description: 'Expected number, received string' }", async () => {
    const requestBody = JSON.stringify({ a: "1", b: 2 });
    const res = await app.request(
      "/posts",
      {
        method: "POST",
      },
      {
        event: {
          body: requestBody,
        },
      }
    );

    const body = await res.json();

    expect(body).toEqual({
      error: "Invalid input",
      description: "Expected number, received string",
    });
  });
});

describe.skip("GET /posts", () => {
  test("should return posts from 2022 to 2024", async () => {
    const res = await app.request(
      "/posts",
      {
        method: "GET",
      },
      {
        event: {
          queryStringParameters: {
            from: "2022-01-01T00:00:00Z",
            to: "2024-01-01T00:00:00Z",
          },
        },
      }
    );

    const body = await res.json();

    expect(body).toEqual([
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
    ]);
  });
});

describe.skip("GET /users", () => {
  test("should get user by id", async () => {
    const res = await app.request(
      "/users/1",
      {
        method: "GET",
      },
      {
        event: {
          pathParameters: {
            id: "1",
          },
        },
      }
    );

    const body = await res.json();

    expect(body).toEqual({
      id: "c7b3d8e0-5e0b-4b0f-8b3a-3b9f4b3d3b3d",
      firstName: "John",
      lastName: "Maverick",
    });
  });
});

describe.skip("POST /customers", () => {
  test("should save a customer", async () => {
    const requestBody = JSON.stringify({
      firstName: "John",
      lastName: "Doe",
      email: "foo@bar.com",
    });

    const res = await app.request(
      "/customers",
      {
        method: "POST",
      },
      {
        event: {
          body: requestBody,
        },
      }
    );

    const body = await res.json();

    expect(body).toEqual({});
  });
});

describe("GET /customers", () => {
  test("should customer by id", async () => {
    const uuid = crypto.randomUUID();
    await dynamoDBDocumentClient.send(
      new PutCommand({
        TableName: CUSTOMERS_TABLE_NAME,
        Item: {
          id: uuid,
          firstName: "John",
          lastName: "Doe",
          email: "foo@bar.com",
        },
      })
    );

    const res = await app.request(
      "/customers/:id",
      {
        method: "GET",
      },
      {
        event: {
          pathParameters: {
            id: uuid,
          },
        },
      }
    );

    const body = await res.json();

    expect(body).toEqual({
      id: uuid,
      firstName: "John",
      lastName: "Doe",
      email: "foo@bar.com",
    });
  });

  test("should return all customers", async () => {
    const res = await app.request("/customers", {
      method: "GET",
    });

    const body = await res.json();

    for (const customer of body) {
      expect(customer).toMatchObject({
        id: expect.any(String),
        firstName: expect.any(String),
        lastName: expect.any(String),
        email: expect.any(String),
      });
    }
  });
});
