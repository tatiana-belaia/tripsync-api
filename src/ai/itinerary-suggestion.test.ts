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

test("rejects an itinerary with invalid activity position", () => {
	const invalidFixture = structuredClone(romeFixture);

	invalidFixture.days[0].activities[0].position = 0;
	const result = ItinerarySuggestionSchema.safeParse(invalidFixture);

	assert.equal(result.success, false);
});

test("rejects an itinerary with missing days", () => {
	const invalidFixture = { title: "Rome" };

	const result = ItinerarySuggestionSchema.safeParse(invalidFixture);

	assert.equal(result.success, false);
});

test("rejects an itinerary when days is not an array", () => {
	const invalidFixture = { title: "Rome", days: "Three days" };

	const result = ItinerarySuggestionSchema.safeParse(invalidFixture);

	assert.equal(result.success, false);

	if (!result.success) {
		assert.equal(result.error.issues[0].path[0], "days");
		assert.equal(result.error.issues[0].code, "invalid_type");
	}
});
