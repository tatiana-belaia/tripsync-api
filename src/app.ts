import Fastify from "fastify";
import type { Pool } from "pg";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";

type Trip = {
	id: string;
	title: string;
};

export function buildApp(db: Pool) {
	const app = Fastify().withTypeProvider<JsonSchemaToTsProvider>();

	app.get("/health", async () => {
		return { status: "ok" };
	});

	app.get("/trips", async () => {
		return [
			{ id: "1", title: "Japan 2027" },
			{ id: "2", title: "Italy 2026" },
		];
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
						required: ["id", "title"],
						properties: {
							id: { type: "string" },
							title: { type: "string" },
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

			const result = await db.query<Trip>(
				"SELECT id, title FROM trips WHERE id = $1",
				[id],
			);

			if (result.rows.length === 0) {
				return reply.code(404).send({
					message: "Trip not found",
				});
			}
			return result.rows[0];
		},
	);

	return app;
}
