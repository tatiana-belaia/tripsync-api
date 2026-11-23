-- Query 1: INNER JOIN
-- Returns only trips that have matching itinerary items
SELECT
    t.id AS trip_id,
    t.title AS trip_title,
    i.title AS item_title,
    i.position
FROM
    trips AS t
    INNER JOIN itinerary_items AS i ON t.id = i.trip_id
ORDER BY
    t.id,
    i.position;

-- Query 2: LEFT JOIN
-- Returns all trips, including those without itinerary items
SELECT
    t.id AS trip_id,
    t.title AS trip_title,
    i.title AS item_title,
    i.position
FROM
    trips AS t
    LEFT JOIN itinerary_items AS i ON t.id = i.trip_id
ORDER BY
    t.id,
    i.position;

-- Query 3: Trip with zero itinerary items
SELECT
    t.id AS trip_id,
    t.title AS trip_title,
    i.title AS item_title
FROM
    trips AS t
    LEFT JOIN itinerary_items AS i ON t.id = i.trip_id
WHERE
    i.id IS NULL;

-- Query 4: Get a trip with its activities ordered by day
SELECT
    t.id AS trip_id,
    t.title AS trip_title,
    i.id AS activity_id,
    i.title AS activity_title,
    i.day_number,
    i.position
FROM
    trips AS t
    LEFT JOIN itinerary_items AS i ON t.id = i.trip_id
WHERE
    t.id = $ 1
ORDER BY
    i.day_number ASC,
    i.position ASC,
    i.id ASC;