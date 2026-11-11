import { buildApp } from "./app";
import { db } from "./db";

async function main() {
	const app = buildApp(db);

	try {
		const response1 = await app.inject({
			method: "GET",
			url: "/trips/not-a-uuid",
		});

		console.log("Status:", response1.statusCode);
		console.log("Body:", response1.json());

		const response2 = await app.inject({
			method: "GET",
			url: "/trips/550e8400-e29b-41d4-a716-446655440000",
		});

		console.log("Status:", response2.statusCode);
		console.log("Body:", response2.json());

		const result = await db.query<{ id: string }>(
			"SELECT id FROM trips WHERE title = $1",
			["Japan 2027"],
		);

		const tripId = result.rows[0]?.id;

		if (!tripId) {
			throw new Error("Test trip not found");
		}

		const response3 = await app.inject({
			method: "GET",
			url: `/trips/${tripId}`,
		});

		console.log("Status:", response3.statusCode);
		console.log("Body:", response3.json());
	} finally {
		await app.close();
		await db.end();
	}
}

main().catch(console.error);
