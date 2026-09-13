# Care Backend MVP — KV Dev Environment

A Cloudflare Worker connected to the "cloud-native development environment" KV namespace with a built-in frontend UI for managing key-value pairs.

## Features

- **REST API** for KV operations:
  - `GET /api/keys` — list all keys
  - `POST /api/keys` — create/update a key (body: `{"key":"...","value":"..."}`)
  - `GET /api/keys/:key` — get a key's value
  - `DELETE /api/keys/:key` — delete a key
- **Frontend UI** at `/` — add, view, and delete KV pairs in the browser

## Deploy

```bash
npx wrangler deploy
```

## KV Namespace

- Name: cloud-native development environment
- ID: f77ba7cffe4e4c0482cbe37cb11f8648
- Binding: `KV` (accessible as `env.KV` in the Worker)
