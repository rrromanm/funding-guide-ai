import { z } from "zod";
import {
  callDetail,
  callListResponse,
  listCallsQuery,
} from "./modules/calls/calls.schema.ts";
import { notificationListResponse } from "./modules/notifications/notifications.schema.ts";
import { profileResponse } from "./modules/profile/profile.schema.ts";
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
    description: "Backend for the PYN funding guide.",
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
                    uptime: {
                      type: "number",
                      description: "Seconds since start",
                    },
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
        description:
          "Ordered by the nearest upcoming deadline, calls without one last. " +
          "Closed calls are excluded unless `status=closed` is given.",
        tags: ["calls"],
        parameters: queryParameters(listCallsQuery),
        responses: {
          "200": jsonResponse("A page of calls", callListResponse),
          "400": errorResponse,
        },
      },
    },
    "/api/notifications": {
      get: {
        summary: "List notifications about relevant funding calls",
        description:
          "Newest first. A notification whose recommendation the admin " +
          "dismissed is left out.",
        tags: ["notifications"],
        responses: {
          "200": jsonResponse("Every notification", notificationListResponse),
        },
      },
    },
    "/api/profile": {
      get: {
        summary: "Get PYN's organisational profile",
        description:
          "A singleton -- there is one profile and it has no id in the path. " +
          "Themes and target groups come from the profile's tags.",
        tags: ["profile"],
        responses: {
          "200": jsonResponse("The profile", profileResponse),
          "404": errorResponse,
        },
      },
    },
    "/api/sources": {
      get: {
        summary: "List scraped sources with their call counts",
        description:
          "One row per configured source, ordered by name. Counts cover the " +
          "source's calls; `relevant` counts the " +
          "calls the matcher rates a strong or possible fit and nobody dismissed.",
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
    },
  },
};
