import { z } from "zod";
import {
  callDetail,
  callListResponse,
  createCallBody,
  listCallsQuery,
} from "./modules/calls/calls.schema.ts";
import { notificationListResponse } from "./modules/notifications/notifications.schema.ts";
import {
  profileResponse,
  updateProfileBody,
} from "./modules/profile/profile.schema.ts";
import { sourceListResponse } from "./modules/sources/sources.schema.ts";

function jsonSchema(schema: z.ZodType, io: "input" | "output" = "output") {
  const { $schema, ...rest } = z.toJSONSchema(schema, { io });

  return rest;
}

function queryParameters(schema: z.ZodObject) {
  const { properties = {}, required = [] } = jsonSchema(schema, "input");

  return Object.entries(properties).map(([name, property]) => ({
    name,
    in: "query",
    required: required.includes(name),
    schema: property,
  }));
}

const errorResponse = {
  description: "Error in the standard shape",
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    },
  },
};

function jsonResponse(description: string, schema: z.ZodType) {
  return {
    description,
    content: { "application/json": { schema: jsonSchema(schema) } },
  };
}

export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Funding Guide API",
    version: "0.1.0",
  },
  servers: [{ url: "/" }],
  paths: {
    "/health": {
      get: {
        summary: "Liveness probe",
        tags: ["system"],
        responses: {
          "200": {
            description: "Service is up",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status", "uptime"],
                  properties: {
                    status: { type: "string", const: "ok" },
                    uptime: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/calls": {
      get: {
        summary: "List funding calls",
        tags: ["calls"],
        parameters: queryParameters(listCallsQuery),
        responses: {
          "200": jsonResponse("A page of calls", callListResponse),
          "400": errorResponse,
        },
      },
      post: {
        summary: "Add a funding call by hand",
        tags: ["calls"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: jsonSchema(createCallBody, "input"),
            },
          },
        },
        responses: {
          "201": jsonResponse("The new call, scored", callDetail),
          "400": errorResponse,
        },
      },
    },
    "/api/notifications": {
      get: {
        summary: "List notifications about relevant funding calls",
        tags: ["notifications"],
        responses: {
          "200": jsonResponse("Every notification", notificationListResponse),
        },
      },
    },
    "/api/profile": {
      get: {
        summary: "Get PYN's organisational profile",
        tags: ["profile"],
        responses: {
          "200": jsonResponse("The profile", profileResponse),
          "404": errorResponse,
        },
      },
      patch: {
        summary: "Edit PYN's organisational profile",
        tags: ["profile"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: jsonSchema(updateProfileBody, "input"),
            },
          },
        },
        responses: {
          "200": jsonResponse("The updated profile", profileResponse),
          "400": errorResponse,
        },
      },
    },
    "/api/sources": {
      get: {
        summary: "List scraped sources with their call counts",
        tags: ["sources"],
        responses: {
          "200": jsonResponse("Every source", sourceListResponse),
        },
      },
    },
    "/api/calls/{id}": {
      get: {
        summary: "Get one funding call with its rounds",
        tags: ["calls"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          "200": jsonResponse("The call", callDetail),
          "400": errorResponse,
          "404": errorResponse,
        },
      },
      delete: {
        summary: "Delete a funding call",
        tags: ["calls"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          "204": { description: "Deleted" },
          "400": errorResponse,
          "404": errorResponse,
        },
      },
    },
  },
};
