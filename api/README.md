# API

Express backend.

```bash
npm install
npm run dev     # http://localhost:4000
```

- Swagger UI: http://localhost:4000/docs
- Raw spec: http://localhost:4000/openapi.json

Routes live in `src/routes/`, the OpenAPI spec in `src/openapi.ts` — add both when adding an endpoint.
Requires Node 22.18+ (TypeScript runs directly, no build step).
