# Secure Ticket

Secure Ticket is a full-stack corporate ticketing and incident operations lab.

## Apps

- `secure-ticket-api` - Node.js, TypeScript, Express, Prisma, JWT, logging, middleware, and tests.
- `secure-ticket-ui` - React, TypeScript, Vite operations dashboard for ticket and audit workflows.

## Local Development

Backend:

```bash
cd secure-ticket-api
npm install
npm run prisma:generate
npm run dev
```

Frontend:

```bash
cd secure-ticket-ui
npm install
npm run dev
```

The UI reads `VITE_API_BASE_URL` from `secure-ticket-ui/.env`. Use `.env.example` files as templates.

## Current Status

The API foundation is implemented with request tracing, structured logging, auth and role middleware, rate limiting, Prisma schema, and tests.

The UI is implemented as the AegisCore Operations Console. It connects to API health and uses seeded incident data until the auth and ticket endpoints are completed.
