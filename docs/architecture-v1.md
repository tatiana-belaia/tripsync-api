# TripSync Itinerary Service — Architecture v1

**Status:** Design exercise, not an implemented-system guarantee.  
**Scope:** One itinerary per trip; Next.js frontend, Fastify API, PostgreSQL database.

## Users and assumptions

- The **trip owner** can manage activities. **Anyone with an active sharing link** can view the itinerary, but cannot edit; the owner can disable sharing.
- An itinerary is organized by day; activities have a title, optional time, location, notes, and a **position** within the day.
- Expected: **100,000 registered users**, **10,000 daily active users**, and **5 trips per registered user on average**. No hard trip limit.
- Real-time collaboration and offline editing are out of scope. Changes auto-save while online; only acknowledged saves are guaranteed to persist.

## Functional requirements

1. **Manage itinerary:** Create, read, update, delete, and reorder activities organized by day.
2. **Auto-save:** Persist successfully saved edits and show saving/error status to the owner.
3. **Read-only sharing:** Enable/disable a shareable link; enforce owner-only editing on the backend.

## Non-functional requirements

1. **Read latency:** Target p95 itinerary load within **1 second** under agreed load.
2. **Save latency:** Target p95 acknowledged save within **2 seconds** under agreed load.
3. **Availability:** Aim for **99.9% monthly uptime**; maintain data integrity for accepted writes.

## Capacity estimate (assumptions, not measurements)

- 10,000 daily active users × **5 reads/day** = **50,000 reads/day** ≈ **0.58 average read RPS**.
- 10,000 daily active users × **10 writes/day** = **100,000 writes/day** ≈ **1.16 average write RPS**.
- Traffic is uneven: actual **peak RPS is unknown** and needs testing. These are assumed backend request counts, not page views or individual keystrokes.

## API sketch

| Action | Proposed endpoint | Body / response |
|---|---|---|
| Read itinerary | `GET /api/itineraries/:itineraryId` | `200` with trip name and `days: [{ date, activities: [{ id, title, position, time?, location?, notes? }] }]` |
| Create activity | `POST /api/activities` | `{ trip_id, title, date, time?, location?, notes? }`; server may assign next `position` |
| Edit activity | `PATCH /api/activities/:activityId` | Only changed fields, e.g. `{ "title": "Tokyo Tower at sunset" }` |
| Delete activity | `DELETE /api/activities/:activityId` | Delete the selected activity |
| Reorder within a day | `PATCH /api/itineraries/:itineraryId/activities/order` | `{ "date": "2027-10-10", "activities": [{ "id": 3, "position": 1 }, { "id": 1, "position": 2 }, { "id": 2, "position": 3 }] }` |

**API-ID decision pending implementation:** Earlier API exercises use `:itineraryId`, but the existing PostgreSQL exercise links `itinerary_items.trip_id` to `trips.id`. With one itinerary per trip, prefer resolving the API to a **trip ID** (for example, `GET /api/trips/:tripId/itinerary`) before coding, and revise the previous API specification consistently. Do not assume an `itineraries` table exists.

**Errors and security:** Missing resource → `404` with `{ "code": "ITINERARY_NOT_FOUND", "message": "Itinerary not found" }`. Invalid or missing authentication on private endpoints → `401`; an authenticated user attempting a forbidden edit → `403` (or deliberately `404` to avoid exposing private resource existence). Sharing links should use unguessable tokens and only permit reads. Validate that every activity belongs to the target trip/day.

## High-level design and read/write data flow

```mermaid
flowchart LR
    U[Owner or link viewer] --> FE[Next.js / React\nTanStack Query cache]
    FE -->|GET / PATCH HTTP| API[Fastify API\nauth, validation, access rules]
    API -->|SQL read / transaction| DB[(PostgreSQL\ntrips + itinerary_items)]
    DB -->|rows / commit outcome| API
    API -->|nested-by-day JSON / errors| FE
```

- **Read:** TanStack Query requests itinerary → Fastify checks visibility → PostgreSQL returns trip/items → Fastify groups activities by day and sorts by `position` → browser renders and caches response.
- **Write/reorder:** Owner sends edits → Fastify verifies ownership, validates dates/positions and item membership → PostgreSQL applies all related position updates in **one transaction** → Fastify acknowledges success → frontend invalidates/updates its cached itinerary. If one update fails, **roll back all** reorder changes.
- **Data design to verify:** Existing `trips` and `itinerary_items` with foreign key `trip_id`; confirm activity date and position fields, and ownership/sharing fields in the real schema before implementation. An index starting with `trip_id` can help itinerary lookups; assess it using query plans.

## Main tradeoffs and bottlenecks

- **Nested day response:** Easy for day-based UI and reordering, but API must transform database rows; avoid assuming nested JSON means a nested database schema.
- **Client caching:** Reduces duplicate fetches, but edits require invalidation/update to avoid stale views. Shared-link revocation must also be enforced server-side, even if a viewer still has cached content.
- **Single Fastify + PostgreSQL for v1:** Simple to build and operate at assumed average traffic. Monitor API latency, database query time, connection saturation, and browser rendering before adding cache servers, replicas, or load balancers.
- **Reorder transaction:** Protects data consistency but may require coordination for concurrent owner edits; version checks or conflict handling can be added if needed.
- **Testing:** First measure where latency occurs, then load-test representative read/write mixes in a safe environment (including peak bursts), rather than treating 1,000 concurrent requests as a proven requirement.

## Tradeoff review and failure scenarios (November 17 exercise)

### Two tradeoffs ###
1. **Nested-by-day response vs. flat activity array (daily itinerary UI).** Nested JSON matches the day-by-day React view, so the frontend does less grouping. The cost is deeper object traversal and more complex immutable updates; a flat array is simpler for generic activity manipulation but requires grouping by date for the daily view. Decision: Keep the nested-by-day GET response for v1.
2. **Nested vs. flat response (trip-wide search).** With a flat array already loaded in the browser, filtering all activities is straightforward. With nested JSON, the client must traverse each day or flatten the activities first. Tradeoff nuance: This concerns client-side searching over a fetched response; backend search can query flat relational activity rows directly, regardless of how the GET response is shaped. Decision: Keep nested GET for the current day-based UI and introduce a dedicated search endpoint only if product needs warrant it.
**Ordering justification:** Give each activity a stable id and an explicit position scoped to its day. Array indexes describe the current array layout, but are not persistent database ordering keys: a deletion, insertion, or new response can shift indexes. Sort by position when reading; validate a complete reorder payload and save all affected positions atomically. If v1 requires consecutive positions, renumber after deletion within a transaction.

**Two API failure scenarios
1. **Missing itinerary:** GET /api/itineraries/:itineraryId for a well-formed nonexistent ID returns 404 Not Found with { "code": "ITINERARY_NOT_FOUND", "message": "Itinerary not found" }. Use a resource-specific error code so the UI can distinguish missing itineraries from other errors.
2. **Database failure halfway through reorder:** PATCH /api/itineraries/:itineraryId/activities/order applies the changes in a database transaction. If an update fails unexpectedly, ROLLBACK all affected position changes and return 500 Internal Server Error, for example { "code": "REORDER_FAILED", "message": "Could not save activity order" }. The frontend should show an error and revert or refetch any optimistic ordering. Do not leave a partially saved order.

## Request Flow and Scalability

### Assumptions

- Initial load: 10,000 daily active users (DAU).
- Growth scenario: 100,000 DAU.
- Each active user generates approximately 5 reads and 10 writes per day.
- At 100,000 DAU, estimated average traffic is about 5.8 read RPS and 11.6 write RPS.
- Actual peak traffic may be substantially higher.

### Request/Data Flow

```mermaid
flowchart TD
    A[Browser / Next.js] --> B{TanStack Query cache}
    B -->|Fresh data| A
    B -->|Fetch needed| C[Fastify API]
    C --> D[Authorization check]
    D -->|Allowed| E[(PostgreSQL)]
    D -->|Denied| F[403 / 404 response]
    E -->|Itinerary records| C
    C -->|Nested-by-day JSON| B
```

For reads, the frontend checks its cache first. If data
must be fetched, Fastify authorizes the request and
retrieves the itinerary from PostgreSQL.

After a successful write, the frontend invalidates
the relevant itinerary query to refresh cached data.

### Potential Bottlenecks

**1. Fastify API server**

Problem: Increased concurrent traffic can overload a
single API instance, increasing response latency.

Investigation:
- Monitor API response time, CPU and memory usage.
- Test concurrent requests with a load-testing tool.
- Determine whether API processing or database
  waiting time is responsible for latency.

**2. PostgreSQL database**

Problem: Slow queries, missing indexes or connection
contention can increase response times as traffic grows.

Investigation:
- Measure database query execution times.
- Examine query plans and relevant indexes.
- Monitor database connections and resource usage.

### Architectural Tradeoffs

**Tradeoff 1: Query optimization vs. read replicas**

Decision: Investigate slow queries and optimize indexes
before introducing database read replicas.

Advantages:
- Lower initial infrastructure complexity and cost.
- Potential improvements without adding another server.

Disadvantages:
- Indexes require storage and increase write overhead.
- One database may eventually become a scaling limit.

**Tradeoff 2: Longer caching vs. frequent refetching**

Decision: Use TanStack Query caching and invalidate
relevant queries after successful edits.

Advantages:
- Faster repeat views.
- Fewer unnecessary API and database requests.

Disadvantages:
- Users may temporarily see stale data.
- Invalidation and refetch behavior require careful
  design, especially for shared itineraries.
```
