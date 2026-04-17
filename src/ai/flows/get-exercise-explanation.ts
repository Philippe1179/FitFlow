'use server';
/**
 * @fileOverview A Genkit flow for generating an explanation for a given fitness exercise.
 *
 * - getExerciseExplanation - A function that handles the exercise explanation generation process.
 * - GetExerciseExplanationInput - The input type for the getExerciseExplanation function.
 * - GetExerciseExplanationOutput - The return type for the getExerciseExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetExerciseExplanationInputSchema = z.object({
  exerciseName: z.string().describe('The name of the exercise to explain.'),
});
export type GetExerciseExplanationInput = z.infer<
  typeof GetExerciseExplanationInputSchema
>;

const GetExerciseExplanationOutputSchema = z.object({
  explanation: z
    .string()
    .describe(
      'A step-by-step guide on how to perform the exercise, including form, safety, and muscles targeted.'
    ),
});
export type GetExerciseExplanationOutput = z.infer<
  typeof GetExerciseExplanationOutputSchema
>;

export async function getExerciseExplanation(
  input: GetExerciseExplanationInput
): Promise<GetExerciseExplanationOutput> {
  return getExerciseExplanationFlow(input);
}

const explanationPrompt = ai.definePrompt({
  name: 'getExerciseExplanationPrompt',
  input: { schema: GetExerciseExplanationInputSchema },
  output: { schema: GetExerciseExplanationOutputSchema },
  prompt: `You are a certified personal trainer and fitness expert.
Provide a very clear and concise guide on how to perform the following exercise: {{{exerciseName}}}.

Your explanation should be short and easy to scan, perfect for someone in the middle of a workout.
- Focus only on the 2-3 most critical steps for proper form and safety.
- Use simple, direct language.
- Do not use markdown formatting.`,
});


const getExerciseExplanationFlow = ai.defineFlow(
  {
    name: 'getExerciseExplanationFlow',
    inputSchema: GetExerciseExplanationInputSchema,
    outputSchema: GetExerciseExplanationOutputSchema,
  },
  async (input) => {
    const { output } = await explanationPrompt(input);
    if (!output) {
      throw new Error('Failed to generate exercise explanation: No output received.');
    }
    return output;
  }
);
