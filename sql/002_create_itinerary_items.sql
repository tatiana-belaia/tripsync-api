CREATE TABLE itinerary_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES trips (id),
    title TEXT NOT NULL,
    position INT NOT NULL CHECK (position >= 0)
);