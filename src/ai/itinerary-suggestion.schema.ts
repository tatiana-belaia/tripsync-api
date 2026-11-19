import { z } from "zod";

export const ItinerarySuggestionSchema = z.strictObject({
	title: z.string().trim().min(1),
	days: z
		.array(
			z.strictObject({
				dayNumber: z.number().int().positive(),
				date: z.iso.date().nullable(),
				activities: z
					.array(
						z.strictObject({
							title: z.string().trim().min(1),
							position: z.number().int().positive(),
						}),
					)
					.min(1),
			}),
		)
		.min(1),
});

export type ItinerarySuggestion = z.infer<typeof ItinerarySuggestionSchema>;
