import { buildApp } from "./app";
import { db } from "./db";

const app = buildApp(db);

app.listen({ port: 3000 }).catch(console.error);

function longestUniqueSequence(pages: string[]): [number, number] {
	if (pages.length === 0) return [0, 0];

	for (let i = 0; i < pages.length; i++) {
		let visitedPages = new Set().add(pages[i]);
		const visitedPagesArray = Array.from(visitedPages);

		for (let k = 0; k < visitedPagesArray.length; k++) {
			if (visitedPages.has(visitedPagesArray[k])) {
				break;
			} else {
				visitedPages.add(visitedPagesArray[k]);
			}
		}
	}
}
