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
                    uptime: { type: "number", description: "Seconds since start" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
