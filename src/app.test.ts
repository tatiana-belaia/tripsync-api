import { test, after } from "node:test";
import assert from "node:assert/strict";

import { buildApp } from "./app";
import { db } from "./db";

const app = buildApp(db);

// Runs after all tests in this file
after(async () => {
	await app.close();
	await db.end();
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
