'use server';
/**
 * @fileOverview A Genkit flow for suggesting alternative exercises.
 *
 * - suggestAlternativeExercise - A function that suggests a replacement for a given exercise.
 * - SuggestAlternativeExerciseInput - The input type for the flow.
 * - SuggestAlternativeExerciseOutput - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAlternativeExerciseInputSchema = z.object({
  exerciseToReplace: z
    .string()
    .describe('The name of the exercise the user wants to replace.'),
  userProfileJson: z
    .string()
    .describe(
      'JSON string representing the user profile, including fitness goals and, most importantly, available equipment.'
    ),
  currentWorkoutJson: z
    .string()
    .describe(
      "JSON string representing the current day's workout plan. This is used to avoid suggesting an exercise that is already in the workout."
    ),
});
export type SuggestAlternativeExerciseInput = z.infer<
  typeof SuggestAlternativeExerciseInputSchema
>;

const SuggestAlternativeExerciseOutputSchema = z.object({
  alternativeExerciseName: z
    .string()
    .describe('The name of the suggested alternative exercise.'),
  reasoning: z
    .string()
    .describe(
      'A brief explanation for why this is a good alternative, mentioning the muscles targeted.'
    ),
});
export type SuggestAlternativeExerciseOutput = z.infer<
  typeof SuggestAlternativeExerciseOutputSchema
>;

export async function suggestAlternativeExercise(
  input: SuggestAlternativeExerciseInput
): Promise<SuggestAlternativeExerciseOutput> {
  return suggestAlternativeExerciseFlow(input);
}

const suggestionPrompt = ai.definePrompt({
  name: 'suggestAlternativeExercisePrompt',
  input: {schema: SuggestAlternativeExerciseInputSchema},
  output: {schema: SuggestAlternativeExerciseOutputSchema},
  prompt: `You are an expert fitness coach AI. A user wants to swap an exercise in their workout.

Your task is to suggest a single, suitable alternative exercise.

**Constraints:**
1.  **Target Same Muscles:** The alternative MUST target the same primary muscle groups as the exercise being replaced.
2.  **Use Available Equipment:** The suggestion MUST be possible with the user's available equipment.
3.  **Avoid Duplicates:** DO NOT suggest an exercise that is already present in the current workout.
4.  **Be Specific:** Provide the name of one exercise, not a list.

**User Profile:**
{{{userProfileJson}}}

**Current Day's Workout:**
{{{currentWorkoutJson}}}

**Exercise to Replace:**
"{{{exerciseToReplace}}}"

Based on the data above, suggest one alternative exercise and provide a brief reasoning.`,
});

const suggestAlternativeExerciseFlow = ai.defineFlow(
  {
    name: 'suggestAlternativeExerciseFlow',
    inputSchema: SuggestAlternativeExerciseInputSchema,
    outputSchema: SuggestAlternativeExerciseOutputSchema,
  },
  async input => {
    const {output} = await suggestionPrompt(input);
    if (!output) {
      throw new Error('Failed to get an exercise suggestion.');
    }
    return output;
  }
);
