# TransformIQ Frontend

This is the TransformIQ web frontend. It was generated in Lovable and adapted for the monorepo.

## Stack

- React + TypeScript
- Vite
- TanStack Start / Router
- Tailwind CSS
- Bun package manager

## Development

```bash
cd frontend
bun install
bun run dev
```

The app currently runs against mock data in `src/data/mockData.ts` while the backend API work is integrated separately.

## Build

```bash
cd frontend
bun run build
```

## Environment

Copy `.env.example` to `.env.local` if you need to point the frontend at your local FastAPI backend:

```bash
cp .env.example .env.local
```

The default API base URL is `http://localhost:8000`.
