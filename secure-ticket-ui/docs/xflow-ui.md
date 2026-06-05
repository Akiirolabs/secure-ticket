# XFlow: AegisCore UI

`xflow` format means:

1. Mermaid flowchart.
2. Short explanation that follows the chart in order.
3. File names included where they matter.

## UI Architecture

```mermaid
flowchart TD
    A[User / Analyst] --> B[index.html]
    B --> C[src/main.tsx]
    C --> D[src/App.tsx]

    D --> E[Layout Shell]
    E --> E1[Sidebar Navigation]
    E --> E2[Topbar]
    E --> E3[Metrics Grid]
    E --> E4[Incident Queue]
    E --> E5[Ticket Detail Panel]
    E --> E6[Audit Stream]

    D --> F[src/api.ts]
    F --> G{Backend Available?}

    G -->|GET /health succeeds| H[API Online]
    G -->|GET /health fails| I[API Offline]

    D --> J[src/data.ts]
    J --> K[Seeded Ticket Data]
    J --> L[Seeded Audit Activity]

    K --> E4
    K --> E5
    L --> E6

    D --> M[src/styles.css]
    M --> N[Dark Blue Corporate UI]
    M --> O[Responsive Layout]
    M --> P[Minimal Futuristic Background]
```

## Backend Connection Flow

```mermaid
flowchart TD
    A[src/App.tsx mounts] --> B[useEffect runs]
    B --> C[src/api.ts]
    C --> D[GET VITE_API_BASE_URL /health]

    D --> E{Response OK?}
    E -->|Yes| F[Set apiState = online]
    E -->|No| G[Set apiState = offline]

    F --> H[Topbar shows API Online]
    G --> I[Topbar shows API Offline]

    J[User clicks login] --> K[src/api.ts login]
    K --> L[POST /auth/login]
    L --> M{Backend route exists?}
    M -->|Future yes| N[Store analyst session from API]
    M -->|Current no| O[Show auth endpoint pending]

    P[Future tickets endpoint] --> Q[GET /tickets with JWT]
    Q --> R[Replace seeded tickets with API tickets]
```

## UI State Flow

```mermaid
flowchart TD
    A[src/App.tsx] --> B[apiState]
    A --> C[session]
    A --> D[loginMessage]
    A --> E[query]
    A --> F[status]
    A --> G[activeTicketId]

    E --> H[filteredTickets]
    F --> H
    H --> I[Incident Queue Rows]

    G --> J[activeTicket]
    H --> J
    J --> K[Ticket Detail Panel]

    C --> L[Session Panel]
    D --> L
    B --> M[API Status Pill]
```

## File-Based Flow

```mermaid
flowchart LR
    A[index.html] --> B[src/main.tsx]
    B --> C[src/App.tsx]

    C --> D[src/api.ts]
    C --> E[src/data.ts]
    C --> F[src/styles.css]

    D --> G[secure-ticket-api /health]
    D -. future .-> H[secure-ticket-api /auth/login]
    D -. future .-> I[secure-ticket-api /tickets]

    E --> J[Seeded tickets]
    E --> K[Seeded activity]

    F --> L[Responsive shell]
    F --> M[Dark blue visual system]
    F --> N[Corporate dashboard styling]

    O[.env] --> D
    P[.env.example] --> O
    Q[vite.config.ts] --> R[Vite dev server]
    S[package.json] --> T[npm run dev / build]
```

## Explanation

The UI starts at `index.html`, which loads `src/main.tsx`.

`src/main.tsx` mounts React and renders `src/App.tsx`.

`src/App.tsx` is the main screen. It owns the dashboard layout, user session state, API health state, search state, status filter, and selected ticket state.

`src/api.ts` is the connection point to the backend. Right now it calls `/health`, and it already has placeholders for `/auth/login` and `/tickets`.

`src/data.ts` provides seeded ticket and audit data while the backend ticket/auth endpoints are still being built.

`src/styles.css` controls the professional dark blue corporate visual system, responsive layout, panels, buttons, queue rows, and background treatment.

When the app loads, it calls the backend health endpoint. If `/health` succeeds, the UI shows `API Online`. If it fails, the UI shows `API Offline`.

When the user clicks login, the UI attempts to call `/auth/login`. Since that backend route is not built yet, the UI shows that the auth endpoint is pending but still lets the console operate in demo analyst mode.

When `/tickets` exists later, `src/api.ts` can replace the seeded data from `src/data.ts` with real ticket data from the backend.
