import {
	type ItinerarySuggestion,
	ItinerarySuggestionSchema,
} from "./itinerary-suggestion.schema.js";

import {
	romeFixture,
	parisFixture,
	lisbonFixture,
} from "./itinerary-suggestion.fixtures.js";

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
	const result = ItinerarySuggestionSchema.safeParse(fixture);

	if (!result.success) {
		throw new Error("Validation error");
	}

	return {
		source: "mock",
		suggestion: result.data,
	};
}

export class UnsupportedDestinationError extends Error {
	constructor() {
		super("Destination is not supported");
		this.name = "UnsupportedDestinationError";
	}
}
