# TripSync — Data Model & Type Contracts

**Status:** Work in progress  
**Purpose:** Document TripSync's existing data structures and the agreed API design. Distinguish implemented functionality from planned features.

## 1. Naming conventions

| Concept | TypeScript name | JSON property | PostgreSQL |
|---|---|---|---|
| Trip | `Trip` | — | `trips` |
| Trip with its itinerary | `TripDetail` | — | — |
| Itinerary day | `ItineraryDay` | `days` | `day_number` |
| Activity | `Activity` | `activities` | `itinerary_items` |
| AI-generated suggestion | `ItinerarySuggestionResponse` | `suggestion` | Not persisted |

**Decisions:**

- A trip has one itinerary, so we don't currently need a separate `Itinerary` entity or table.
- Use `activities` in TypeScript and API JSON.
- Keep the existing `itinerary_items` PostgreSQL table for now.
- Use `snake_case` for SQL columns and database row properties.
- Use `camelCase` for TypeScript domain types and public JSON.

## 2. Existing types and database structures

### Trip — implemented

Both frontend and backend currently have:

```typescript
export type Trip = {
  id: string; // UUID in the real backend
  title: string;
};
```

Used by `GET /trips/:id`, `POST /trips`, and `PATCH /trips/:id`.

The frontend `Trip` is defined in `trip-sync/src/types/trips.ts`. The backend has a local `Trip` type in `tripsync-api/src/app.ts`.

### PostgreSQL — itinerary_items (implemented)

Our database currently contains:

```text
itinerary_items
├── id          UUID PRIMARY KEY
├── trip_id     UUID FOREIGN KEY → trips.id
├── title       TEXT NOT NULL
├── position    INTEGER >= 0
└── day_number  INTEGER >= 1, DEFAULT 1
```

`day_number` was added in migration `004_add_activity_day_number.sql`.

`position` currently permits zero. We haven't yet normalized it to a consistent 1-based ordering system.

### Frontend ItineraryItem — legacy/mock implementation

Currently defined in `trip-sync/src/data/itinerary.ts`:

```typescript
export type ItineraryItem = {
  id: number;
  tripId: string;
  title: string;
  date: string;
  location: string;
};
```

This belongs to the older frontend mock itinerary implementation.

It **does not match the real PostgreSQL schema**. It has numeric IDs, different fields, and is used by the frontend's mock itinerary route.

It should eventually be replaced by the new `Activity` contract.

### AI itinerary suggestion — implemented

```typescript
export type ItinerarySuggestionResponse = {
  source: "mock";
  suggestion: {
    title: string;
    days: {
      dayNumber: number;
      date: string | null;
      activities: {
        title: string;
        position: number;
      }[];
    }[];
  };
};
```

This represents **unsaved AI-generated data**.

Activities don't have IDs because they haven't been persisted in PostgreSQL.

The backend has a Zod schema for this structure. The frontend currently maintains a separate TypeScript representation.

## 3. Agreed API response types — next implementation

These are our intended contracts for extending `GET /trips/:id`. They are **not yet fully implemented**.

### Activity

```typescript
export type Activity = {
  id: string; // Database UUID
  title: string;
  position: number;
};
```

### ItineraryDay

```typescript
export type ItineraryDay = {
  dayNumber: number;
  activities: Activity[];
};
```

### TripDetail

```typescript
export type TripDetail = Trip & {
  days: ItineraryDay[];
};
```

`TripDetail` represents the complete response of `GET /trips/:id`, while `Trip` is the smaller representation used by other trip endpoints.

**Expected JSON:**

```json
{
  "id": "trip-uuid",
  "title": "Japan 2027",
  "days": [
    {
      "dayNumber": 1,
      "activities": [
        {
          "id": "activity-uuid",
          "title": "Visit Tokyo",
          "position": 0
        }
      ]
    }
  ]
}
```

The IDs above are illustrative placeholders, not valid UUID literals.

A trip with no activities returns `"days": []`.

## 4. Backend-only SQL result type

A `LEFT JOIN` returns flat rows, not nested objects.

We'll use:

```typescript
type TripActivityRow = {
  trip_id: string;
  trip_title: string;
  activity_id: string | null;
  activity_title: string | null;
  day_number: number | null;
  position: number | null;
};
```

The activity fields are nullable because `LEFT JOIN` preserves a trip even when no activity matches.

This is **not a public API type**. It represents a single SQL result row.

The backend transforms these rows into `TripDetail`.

Example mapping:

```typescript
const activity: Activity = {
  id: row.activity_id,
  title: row.activity_title,
  position: row.position,
};
```

This mapping is valid only after checking that the activity fields are not `null`.

For days, `row.day_number` becomes the API field `dayNumber`.

## 5. Existing request contracts

```typescript
type CreateTripRequest = {
  title: string;
};

type UpdateTripRequest = {
  title: string;
};
```

`POST /trips` and `PATCH /trips/:id` currently require a title and validate it with Fastify JSON Schema.

They are separate from response types because incoming requests don't contain a database-generated trip ID.

## 6. Future fields and features — not implemented

Later, after today's GET task:

- `Trip` may gain `startDate: string | null`.
- `ItineraryDay` may gain `date: string | null`.
- `Activity` may gain `location: string | null`.
- Saved itineraries may support editing and reordering activities.
- The frontend mock itinerary model will migrate to UUID-backed activities.
- We may share runtime-validated contracts across both repositories.

At that point, we'll also align the position rules: the AI schema currently requires positive positions, while PostgreSQL permits position `0`.

## 7. Rules for future development

1. Check this document before introducing a new Trip/Activity type.
2. Keep SQL row types separate from API response types.
3. Derive frontend and backend contracts from shared schemas when integration begins.
4. Do not confuse AI suggestions with persisted activities.
5. Update this document whenever we deliberately change an API contract.
6. Update Fastify response schemas whenever response properties are added, or serialization may omit them.

**Current priority:** Implement `GET /trips/:id` returning `TripDetail`, using the existing database and ordering activities by `day_number` and `position`.