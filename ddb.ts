import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const config =
  process.env.NODE_ENV !== "test"
    ? {}
    : {
        endpoint: "http://localhost:8000",
        region: "local",
        credentials: {
          accessKeyId: "local",
          secretAccessKey: "local",
        },
      };

export const client = DynamoDBDocumentClient.from(new DynamoDBClient(config));

export const Table = {
  Customer: "Customer",
} as const;
