'use server';
/**
 * @fileOverview A Genkit flow for rerolling a single exercise within a HIIT circuit.
 *
 * - suggestHiitInterval - A function that suggests a replacement for one interval.
 * - SuggestHiitIntervalInput - The input type for the flow.
 * - SuggestHiitIntervalOutput - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestHiitIntervalInputSchema = z.object({
  exerciseToReplace: z
    .string()
    .describe('The name of the interval exercise the user wants to reroll.'),
  userProfileJson: z
    .string()
    .describe(
      'JSON string representing the user profile, including fitness goals, skill level, and available equipment.'
    ),
  currentWorkoutJson: z
    .string()
    .describe(
      'JSON string of the full HIIT circuit (name, rounds, intervals). Used to avoid suggesting an exercise already present and to keep the replacement consistent with the rest of the circuit.'
    ),
  additionalPreferences: z
    .string()
    .optional()
    .describe(
      'Free-text extra equipment or constraints from the user (e.g. "I have a jump rope", "no exercises on the ground"). Overrides availableEquipment when there is a conflict.'
    ),
});
export type SuggestHiitIntervalInput = z.infer<typeof SuggestHiitIntervalInputSchema>;

const SuggestHiitIntervalOutputSchema = z.object({
  name: z.string().describe('The name of the suggested replacement exercise.'),
  workSeconds: z.number().int().positive().describe('Suggested work duration in seconds.'),
  restSeconds: z.number().int().nonnegative().describe('Suggested rest duration in seconds after this exercise.'),
  reasoning: z
    .string()
    .describe('A brief explanation for why this is a good replacement in this circuit.'),
});
export type SuggestHiitIntervalOutput = z.infer<typeof SuggestHiitIntervalOutputSchema>;

export async function suggestHiitInterval(
  input: SuggestHiitIntervalInput
): Promise<SuggestHiitIntervalOutput> {
  return suggestHiitIntervalFlow(input);
}

const suggestionPrompt = ai.definePrompt({
  name: 'suggestHiitIntervalPrompt',
  input: {schema: SuggestHiitIntervalInputSchema},
  output: {schema: SuggestHiitIntervalOutputSchema},
  prompt: `You are an expert fitness coach AI. A user wants to reroll (swap) a single exercise within one interval of their HIIT circuit, keeping the rest of the circuit unchanged.

**Constraints:**
1. **Fit the Circuit:** The replacement should be a similarly intense, similarly-styled cardio/HIIT exercise appropriate for the same slot in the circuit.
2. **Use Available Equipment:** The suggestion MUST be possible with the user's available equipment.
3. **Respect Additional Preferences:** If additional preferences/constraints are provided, they take priority over the general equipment field — e.g. if the user excludes a movement type (like getting on the ground/floor), do not suggest anything involving that movement.
4. **Avoid Duplicates:** DO NOT suggest an exercise that is already present elsewhere in the circuit's intervals.
5. **Be Specific:** Provide exactly one replacement exercise, with recommended work and rest seconds.

**User Profile:**
{{{userProfileJson}}}

**Current HIIT Circuit:**
{{{currentWorkoutJson}}}

**Additional Preferences/Constraints:**
{{{additionalPreferences}}}

**Exercise to Replace:**
"{{{exerciseToReplace}}}"

Based on the data above, suggest one replacement exercise with work/rest seconds and a brief reasoning.`,
});

const suggestHiitIntervalFlow = ai.defineFlow(
  {
    name: 'suggestHiitIntervalFlow',
    inputSchema: SuggestHiitIntervalInputSchema,
    outputSchema: SuggestHiitIntervalOutputSchema,
  },
  async (input) => {
    const {output} = await suggestionPrompt(input);
    if (!output) {
      throw new Error('Failed to get an interval suggestion.');
    }
    return output;
  }
);
