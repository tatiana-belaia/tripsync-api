import assert from "node:assert/strict";
import test from "node:test";

import { ItinerarySuggestionSchema } from "./itinerary-suggestion.schema.js";
import {
	romeFixture,
	parisFixture,
	lisbonFixture,
} from "./itinerary-suggestion.fixtures.js";

test("validates a 3-day itinerary with unknown dates", () => {
	const result = ItinerarySuggestionSchema.safeParse(romeFixture);

	assert.equal(result.success, true);
});

test("validates a 2-day itinerary with known dates", () => {
	const result = ItinerarySuggestionSchema.safeParse(parisFixture);

	assert.equal(result.success, true);
});

test("validates a single-day itinerary with one activity", () => {
	const result = ItinerarySuggestionSchema.safeParse(lisbonFixture);

	assert.equal(result.success, true);
});
