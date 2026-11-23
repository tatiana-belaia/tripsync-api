import Fastify from "fastify";
import type { Pool } from "pg";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import {
	getMockItinerarySuggestion,
	UnsupportedDestinationError,
} from "./ai/mock-itinerary-suggestion";

type Trip = {
	id: string;
	title: string;
};

type TripActivityRow = {
	trip_id: string;
	trip_title: string;
	activity_id: string | null;
	activity_title: string | null;
	day_number: number | null;
	position: number | null;
};

type Activity = {
	id: string;
	title: string;
	position: number;
};

type ItineraryDay = {
	dayNumber: number;
	activities: Activity[];
};

type TripDetail = Trip & {
	days: ItineraryDay[];
};

export function buildApp(db: Pool) {
	const app = Fastify().withTypeProvider<JsonSchemaToTsProvider>();

	app.get("/health", async () => {
		return { status: "ok" };
	});

	app.get("/trips", async () => {
		const result = await db.query<Trip>(
			"SELECT id, title FROM trips ORDER BY title",
		);

		return result.rows;
	});

	app.get(
		"/trips/:id",
		{
			schema: {
				params: {
					type: "object",
					required: ["id"],
					properties: {
						id: { type: "string", format: "uuid" },
					},
				},
				response: {
					200: {
						type: "object",
						required: ["id", "title", "days"],
						properties: {
							id: { type: "string" },
							title: { type: "string" },
							days: {
								type: "array",
								items: {
									type: "object",
									required: ["dayNumber", "activities"],
									properties: {
										dayNumber: { type: "integer" },
										activities: {
											type: "array",
											items: {
												type: "object",
												required: ["id", "title", "position"],
												properties: {
													id: { type: "string" },
													title: { type: "string" },
													position: { type: "integer" },
												},
											},
										},
									},
								},
							},
						},
					},
					404: {
						type: "object",
						required: ["message"],
						properties: {
							message: { type: "string" },
						},
					},
				},
			},
		},
		async (request, reply) => {
			const id = request.params.id;

			const result = await db.query<TripActivityRow>(
				`SELECT
    				t.id AS trip_id,
    				t.title AS trip_title,
    				i.id AS activity_id,
    				i.title AS activity_title,
    				i.day_number,
    				i.position
  				FROM trips AS t
  				LEFT JOIN itinerary_items AS i
    				ON t.id = i.trip_id
  				WHERE t.id = $1
  				ORDER BY i.day_number, i.position, i.id`,
				[id],
			);

			if (result.rows.length === 0) {
				return reply.code(404).send({
					message: "Trip not found",
				});
			}
			const firstRow = result.rows[0];

			const trip: TripDetail = {
				id: firstRow.trip_id,
				title: firstRow.trip_title,
				days: [],
			};

			for (const row of result.rows) {
				if (
					row.activity_id === null ||
					row.activity_title === null ||
					row.day_number === null ||
					row.position === null
				) {
					continue;
				}
				const dayNumber = row.day_number;

				let day = trip.days.find((day) => day.dayNumber === dayNumber);

				if (!day) {
					day = {
						dayNumber,
						activities: [],
					};

					trip.days.push(day);
				}

				const activity: Activity = {
					id: row.activity_id,
					title: row.activity_title,
					position: row.position,
				};

				day.activities.push(activity);
			}

			return trip;
		},
	);

	app.post(
		"/trips",
		{
			schema: {
				body: {
					type: "object",
					required: ["title"],
					properties: {
						title: {
							type: "string",
							minLength: 1,
							maxLength: 120,
							pattern: "\\S",
						},
					},
				},
			},
		},
		async (request, reply) => {
			const title = request.body.title.trim();

			const result = await db.query<Trip>(
				"INSERT INTO trips (title) VALUES ($1) RETURNING id, title",
				[title],
			);

			return reply.code(201).send(result.rows[0]);
		},
	);

	app.patch(
		"/trips/:id",
		{
			schema: {
				params: {
					type: "object",
					required: ["id"],
					properties: {
						id: { type: "string", format: "uuid" },
					},
				},
				body: {
					type: "object",
					required: ["title"],
					properties: {
						title: {
							type: "string",
							minLength: 1,
							maxLength: 120,
							pattern: "\\S",
						},
					},
				},
			},
		},
		async (request, reply) => {
			const id = request.params.id;
			const title = request.body.title.trim();

			const result = await db.query<Trip>(
				"UPDATE trips SET title = $1 WHERE id = $2 RETURNING id, title",
				[title, id],
			);

			if (result.rows.length === 0) {
				return reply.code(404).send({
					message: "Trip not found",
				});
			}

			return reply.code(200).send(result.rows[0]);
		},
	);

	app.post(
		"/ai/itinerary-suggestions",
		{
			schema: {
				body: {
					type: "object",
					required: ["destination"],
					properties: {
						destination: {
							type: "string",
							minLength: 1,
							pattern: "\\S",
						},
					},
					additionalProperties: false,
				},
			},
		},
		async (request, reply) => {
			const destination = request.body.destination.trim();

			try {
				const result = getMockItinerarySuggestion(destination);

				return reply.code(200).send(result);
			} catch (error) {
				if (error instanceof UnsupportedDestinationError) {
					return reply.code(400).send({ message: error.message });
				}

				throw error;
			}
		},
	);

	return app;
}
