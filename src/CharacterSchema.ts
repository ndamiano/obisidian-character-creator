import { z } from "zod";

export const CharacterSchema = z.object({
	name: z.string(),
	description: z.string(),
});
