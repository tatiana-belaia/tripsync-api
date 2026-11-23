ALTER TABLE
    itinerary_items
ADD
    COLUMN day_number INTEGER NOT NULL DEFAULT 1 CHECK (day_number >= 1);