import {
	type ItinerarySuggestion,
	ItinerarySuggestionSchema,
} from "./itinerary-suggestion.schema.js";

import {
	romeFixture,
	parisFixture,
	lisbonFixture,
} from "./itinerary-suggestion.fixtures.js";

export function validateSuggestion(data: unknown) {
	const result = ItinerarySuggestionSchema.safeParse(data);

	if (!result.success) {
		throw new Error("Invalid itinerary suggestion");
	}

	return result.data;
}

export function getMockItinerarySuggestion(destination: string) {
	const normalizedDestination = destination.trim().toLowerCase();

	const fixtures: Record<string, ItinerarySuggestion> = {
		rome: romeFixture,
		paris: parisFixture,
		lisbon: lisbonFixture,
	};

	const fixture = fixtures[normalizedDestination];

	if (!fixture) {
		throw new UnsupportedDestinationError();
	}

	const validatedSuggestion = validateSuggestion(fixture);

	return {
		source: "mock",
		suggestion: validatedSuggestion,
	};
}

export class UnsupportedDestinationError extends Error {
	constructor() {
		super("Destination is not supported");
		this.name = "UnsupportedDestinationError";
	}
}
