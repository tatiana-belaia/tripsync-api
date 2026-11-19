import type { ItinerarySuggestion } from "./itinerary-suggestion.schema.js";

export const romeFixture: ItinerarySuggestion = {
	title: "Rome — History and Food",
	days: [
		{
			dayNumber: 1,
			date: null,
			activities: [
				{
					title: "Visit the Colosseum",
					position: 1,
				},
				{
					title: "Explore the Roman Forum",
					position: 2,
				},
			],
		},
		{
			dayNumber: 2,
			date: null,
			activities: [
				{
					title: "Visit the Vatican Museums",
					position: 1,
				},
				{
					title: "Try Traditional Roman Pasta",
					position: 2,
				},
			],
		},
		{
			dayNumber: 3,
			date: null,
			activities: [
				{
					title: "Explore the Historic Center",
					position: 1,
				},
				{
					title: "Visit the Pantheon",
					position: 2,
				},
			],
		},
	],
};

export const parisFixture: ItinerarySuggestion = {
	title: "Paris — Culture and Food",
	days: [
		{
			dayNumber: 1,
			date: "2026-10-11",
			activities: [
				{
					title: "Visit the Eiffel tower",
					position: 1,
				},
				{
					title: "Explore the Louvre",
					position: 2,
				},
			],
		},
		{
			dayNumber: 2,
			date: "2026-10-12",
			activities: [
				{
					title: "Eat at the traditional restaurant",
					position: 1,
				},
				{
					title: "Try souffle",
					position: 2,
				},
			],
		},
	],
};

export const lisbonFixture: ItinerarySuggestion = {
	title: "Lisbon — Explore",
	days: [
		{
			dayNumber: 1,
			date: null,
			activities: [
				{
					title: "Visit the city center",
					position: 1,
				},
			],
		},
	],
};
