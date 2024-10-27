import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let client: DynamoDBClient;
if (process.env.NODE_ENV === "test") {
  console.log("Using local DynamoDB");
  client = new DynamoDBClient({
    endpoint: "http://localhost:8000",
    region: "local",
    credentials: {
      accessKeyId: "local",
      secretAccessKey: "local",
    },
  });
} else {
  client = new DynamoDBClient();
}

export const CUSTOMERS_TABLE_NAME = "Customers";

export const dynamoDBDocumentClient = DynamoDBDocumentClient.from(client);
