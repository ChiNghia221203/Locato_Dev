# Nest Storage Demo

Minimal NestJS project with Prisma and a StorageModule compatible with Cloudflare R2 or AWS S3.

Quick start:

1. Install deps

```bash
cd d:/Test/nest-storage
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

2. Use endpoints:
- `POST /api/storage/upload` (form file field `file`)
- `POST /api/storage/presign` JSON `{ "fileName": "a.png", "contentType": "image/png" }`

Env: copy `.env.example` to `.env` and set credentials.
