import assert from "node:assert/strict";
import test from "node:test";
import { validateSuggestion } from "./mock-itinerary-suggestion";
import { romeFixture } from "./itinerary-suggestion.fixtures";

test("returns a validated itinerary for valid input", () => {
	const result = validateSuggestion(romeFixture);

	assert.deepEqual(result, romeFixture);
});

test("throws when the itinerary suggestion is invalid", () => {
	const invalidFixture = {
		title: "Rome",
		days: [],
	};

	assert.throws(() => validateSuggestion(invalidFixture), {
		message: "Invalid itinerary suggestion",
	});
});
