import { test, after } from "node:test";
import assert from "node:assert/strict";

import { buildApp } from "./app";
import { db } from "./db";
import { Pool } from "pg";

const app = buildApp(db);

// Runs after all tests in this file
after(async () => {
	await app.close();
	await db.end();
});

test("GET /trips returns trips from the database", async () => {
	const expectedTrips = [
		{
			id: "4dea395d-6748-4a53-926d-bb87564ac5e5",
			title: "Japan 2027",
		},
	];

	let queryCalled = false;

	const db = {
		query: async () => {
			queryCalled = true;

			return { rows: expectedTrips };
		},
	} as unknown as Pool;

	const app = buildApp(db);

	try {
		const response = await app.inject({
			method: "GET",
			url: "/trips",
		});

		assert.equal(response.statusCode, 200);
		assert.deepEqual(response.json(), expectedTrips);
		assert.equal(queryCalled, true);
	} finally {
		await app.close();
	}
});

test("GET /trips/:id returns 400 for invalid UUID", async () => {
	const response = await app.inject({
		method: "GET",
		url: "/trips/not-a-uuid",
	});

	assert.equal(response.statusCode, 400);
});

test("GET /trips/:id returns 404 for missing trip", async () => {
	const response = await app.inject({
		method: "GET",
		url: "/trips/550e8400-e29b-41d4-a716-446655440000",
	});

	assert.equal(response.statusCode, 404);
	assert.deepEqual(response.json(), {
		message: "Trip not found",
	});
});

test("GET /trips/:id returns 200", async () => {
	const result = await db.query<{ id: string }>(
		"INSERT INTO trips (title) VALUES ($1) RETURNING id",
		["My test trip"],
	);

	const tripId = result.rows[0].id;

	if (!tripId) {
		throw new Error("Failed to create test trip");
	}

	try {
		const response = await app.inject({
			method: "GET",
			url: `/trips/${tripId}`,
		});

		assert.equal(response.statusCode, 200);
		assert.deepEqual(response.json(), {
			id: tripId,
			title: "My test trip",
		});
	} finally {
		await db.query("DELETE FROM trips WHERE id = $1", [tripId]);
	}
});

test("POST /trips returns 201 for valid data", async () => {
	const response = await app.inject({
		method: "POST",
		url: "/trips",
		payload: {
			title: "Italy 2027",
		},
	});

	const createdTrip = response.json();

	try {
		assert.equal(response.statusCode, 201);
		assert.equal(createdTrip.title, "Italy 2027");
		assert.equal(typeof createdTrip.id, "string");
	} finally {
		if (createdTrip.id) {
			await db.query("DELETE FROM trips WHERE id = $1", [createdTrip.id]);
		}
	}
});

test("POST /trips returns 400 for empty title", async () => {
	const response = await app.inject({
		method: "POST",
		url: "/trips",
		payload: {
			title: "",
		},
	});

	assert.equal(response.statusCode, 400);
});

test("PATCH /trips/:id returns 200 for valid update", async () => {
	const result = await db.query<{ id: string }>(
		"INSERT INTO trips (title) VALUES ($1) RETURNING id",
		["Japan 2027"],
	);

	const tripId = result.rows[0].id;

	try {
		const response = await app.inject({
			method: "PATCH",
			url: `/trips/${tripId}`,
			payload: {
				title: "Japan 2028",
			},
		});

		const updatedTrip = response.json();

		assert.equal(response.statusCode, 200);
		assert.equal(updatedTrip.title, "Japan 2028");
		assert.equal(updatedTrip.id, tripId);
	} finally {
		await db.query("DELETE FROM trips WHERE id = $1", [tripId]);
	}
});

test("PATCH /trips/:id returns 404 for missing trip", async () => {
	const response = await app.inject({
		method: "PATCH",
		url: "/trips/550e8400-e29b-41d4-a716-446655440000",
		payload: {
			title: "Japan 2028",
		},
	});

	assert.equal(response.statusCode, 404);
	assert.deepEqual(response.json(), {
		message: "Trip not found",
	});
});

test("PATCH /trips/:id returns 400 for empty title", async () => {
	const response = await app.inject({
		method: "PATCH",
		url: "/trips/550e8400-e29b-41d4-a716-446655440000",
		payload: {
			title: "",
		},
	});

	assert.equal(response.statusCode, 400);
});
