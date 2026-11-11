CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL
    CHECK (length(btrim(title)) BETWEEN 1 AND 120)
);

INSERT INTO trips (title)
VALUES ('Japan 2027')
RETURNING id;
