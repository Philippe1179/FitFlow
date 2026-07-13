'use server';
/**
 * @fileOverview A Genkit flow for generating a HIIT (High-Intensity Interval Training) circuit
 * that can serve as a step-goal-equivalent cardio session.
 *
 * - generateHiitWorkout - A function that handles HIIT workout generation.
 * - GenerateHiitWorkoutInput - The input type for the generateHiitWorkout function.
 * - GenerateHiitWorkoutOutput - The return type for the generateHiitWorkout function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHiitWorkoutInputSchema = z.object({
  fitnessGoals: z.string().describe("The user's primary fitness goals."),
  availableEquipment: z
    .string()
    .describe('A comma-separated list of available fitness equipment.'),
  skillLevel: z
    .string()
    .describe('The user\'s current fitness skill level (e.g., "beginner", "intermediate", "advanced").'),
  targetDurationMinutes: z
    .number()
    .positive()
    .describe('Roughly how many minutes the whole HIIT session should take, including rest.'),
});
export type GenerateHiitWorkoutInput = z.infer<
  typeof GenerateHiitWorkoutInputSchema
>;

const HiitIntervalSchema = z.object({
  name: z.string().describe('The name of the exercise for this work interval (e.g., "Jumping Jacks").'),
  workSeconds: z.number().int().positive().describe('Duration of the work interval in seconds.'),
  restSeconds: z.number().int().nonnegative().describe('Duration of the rest interval after this exercise, in seconds.'),
});

const GenerateHiitWorkoutOutputSchema = z.object({
  name: z.string().describe('A short, motivating name for the HIIT circuit (e.g., "Rainy Day Cardio Blast").'),
  rounds: z.number().int().positive().describe('How many times the full circuit of intervals should be repeated.'),
  intervals: z
    .array(HiitIntervalSchema)
    .describe('The ordered list of exercises that make up one lap of the circuit.'),
});
export type GenerateHiitWorkoutOutput = z.infer<
  typeof GenerateHiitWorkoutOutputSchema
>;

export async function generateHiitWorkout(
  input: GenerateHiitWorkoutInput
): Promise<GenerateHiitWorkoutOutput> {
  return generateHiitWorkoutFlow(input);
}

const hiitWorkoutPrompt = ai.definePrompt({
  name: 'generateHiitWorkoutPrompt',
  input: { schema: GenerateHiitWorkoutInputSchema },
  output: { schema: GenerateHiitWorkoutOutputSchema },
  prompt: `You are an AI fitness coach designing a High-Intensity Interval Training (HIIT) circuit.

This HIIT session is meant to be a substitute cardio option for a day when the user can't hit their normal step goal (e.g. bad weather, no time to walk). It should be intense enough to serve as a genuine cardio equivalent in a short amount of time.

**User's Profile:**
- Fitness Goals: {{{fitnessGoals}}}
- Available Equipment: {{{availableEquipment}}}
- Skill Level: {{{skillLevel}}}
- Target Total Duration: about {{{targetDurationMinutes}}} minutes (including rest)

**Requirements:**
- Only use exercises that fit the available equipment (use bodyweight exercises if equipment is limited).
- Choose exercises appropriate for the user's skill level.
- Design 4-8 intervals for one circuit "lap".
- Pick work/rest durations (in seconds) and a number of rounds so the total time roughly matches the target duration.
- Give the circuit a short, motivating name.

Provide the output in the specified JSON format.`,
});

const generateHiitWorkoutFlow = ai.defineFlow(
  {
    name: 'generateHiitWorkoutFlow',
    inputSchema: GenerateHiitWorkoutInputSchema,
    outputSchema: GenerateHiitWorkoutOutputSchema,
  },
  async (input) => {
    const { output } = await hiitWorkoutPrompt(input);
    if (!output) {
      throw new Error('Failed to generate HIIT workout: No output received.');
    }
    return output;
  }
);
