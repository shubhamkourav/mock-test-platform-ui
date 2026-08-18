# Mock Test Platform UI

Next.js frontend for the mock-test platform.

## Stack

- Next.js App Router
- TypeScript
- Material UI
- Redux Toolkit
- Native fetch API

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

The API is expected at `NEXT_PUBLIC_API_URL`.

## Pages

- `/` student dashboard
- `/login`
- `/exams`
- `/tests/[id]`
- `/attempt/[id]`
- `/attempt/[id]/result`
- `/admin`

The UI intentionally keeps API calls in a small client layer so the backend can evolve independently.
