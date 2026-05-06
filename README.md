# DocFlow

DocFlow is a full-stack collaborative document editor scaffold.

## Stack

- Client: React, Vite, React Router v6, Tailwind CSS
- Server: Node.js, Express, Prisma ORM, SQLite, JWT auth

## Setup

```bash
npm run install:all
cp server/.env.example server/.env
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The client runs on `http://localhost:5173` and proxies API calls to the server on `http://localhost:4000`.

## Demo Users

All demo users use the password `demo123`.

- `alice@demo.com`
- `bob@demo.com`
- `carol@demo.com`

## Auth API

- `POST /api/auth/login` with `{ "email": "...", "password": "..." }`
- `GET /api/auth/me` with `Authorization: Bearer <token>`

## Documents API

All document routes require `Authorization: Bearer <token>`.

- `GET /api/documents`
- `POST /api/documents`
- `GET /api/documents/:id`
- `PUT /api/documents/:id`
- `DELETE /api/documents/:id`

Document content is stored as TipTap JSON serialized into the Prisma `Document.content` field.

## Upload API

- `POST /api/upload` with multipart field `file`

Only `.txt` and `.md` files are accepted. Uploaded text is stored as a serialized JSON wrapper and converted into TipTap document content by the editor.

## Sharing API

- `GET /api/users`
- `POST /api/documents/:id/share` with `{ "userId": "..." }`
- `DELETE /api/documents/:id/share/:userId`

## Stretch Features

- Editor export supports Markdown and plain text downloads.
- Owners can open version history, preview saved versions, and restore content into the editor.
- Version history requires running a Prisma migration after the `DocumentVersion` schema change.
