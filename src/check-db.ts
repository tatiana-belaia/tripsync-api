import { db } from "./db";

async function main() {
	try {
		const result = await db.query("SELECT * FROM trips");
		console.log(result.rows);
	} finally {
		await db.end();
	}
}

main().catch(console.error);
