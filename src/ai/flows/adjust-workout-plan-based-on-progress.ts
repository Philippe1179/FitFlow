'use server';
/**
 * @fileOverview A Genkit flow that intelligently adjusts a user's workout plan based on their logged progress, performance, and notes.
 *
 * - adjustWorkoutPlanBasedOnProgress - A function that handles the workout plan adjustment process.
 * - AdjustWorkoutPlanInput - The input type for the adjustWorkoutPlanBasedOnProgress function.
 * - AdjustWorkoutPlanOutput - The return type for the adjustWorkoutPlanBasedOnProgress function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema for the workout plan adjustment flow
const AdjustWorkoutPlanInputSchema = z.object({
  userProfileJson: z
    .string()
    .describe(
      'JSON string representing the user profile, including age, weight, height, fitness goals, available equipment, and skill level.'
    ),
  currentWorkoutPlanJson: z
    .string()
    .describe(
      'JSON string representing the current weekly workout plan. It details each day with exercises, sets, reps, and target weights/bodyweight options.'
    ),
  completedWorkoutsJson: z
    .string()
    .describe(
      'JSON string representing data about completed workouts. This includes logged sets, reps, actual weights used, and any user notes for each exercise or workout session.'
    ),
});
export type AdjustWorkoutPlanInput = z.infer<typeof AdjustWorkoutPlanInputSchema>;

// Output Schema for the adjusted workout plan
const AdjustWorkoutPlanOutputSchema = z.object({
  adjustedWorkoutPlanJson: z
    .string()
    .describe(
      'A JSON string representing the adjusted weekly workout plan. It should follow a similar structure to the currentWorkoutPlanJson but with intelligent modifications based on the user\'s progress and profile. Ensure it is valid JSON.'
    ),
  adjustmentSummary: z
    .string()
    .describe(
      'A clear, concise summary explaining the key adjustments made to the workout plan and the rationale behind these changes, based on the user\'s performance and notes.'
    ),
});
export type AdjustWorkoutPlanOutput = z.infer<typeof AdjustWorkoutPlanOutputSchema>;

// Wrapper function to call the Genkit flow
export async function adjustWorkoutPlanBasedOnProgress(
  input: AdjustWorkoutPlanInput
): Promise<AdjustWorkoutPlanOutput> {
  return adjustWorkoutPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustWorkoutPlanPrompt',
  input: {schema: AdjustWorkoutPlanInputSchema},
  output: {schema: AdjustWorkoutPlanOutputSchema},
  prompt: `You are an expert fitness coach and AI assistant for a fitness app called FitFlow.
Your task is to intelligently adjust a user's 7-day workout plan based on their past performance, logged data, and current fitness profile.

When adjusting the plan:
- Analyze the user's completed workouts, including logged reps, weights, and notes, to gauge performance.
- For workout days, apply progressive overload if the user is excelling. If they are struggling, suggest modifications or slight reductions in intensity.
- For "Rest Days", ensure they remain rest days with an empty 'exercises' array, but you can adjust the active recovery suggestions in the 'cardio', 'coolDown', or 'notes' fields based on user feedback (e.g., if they reported being very sore).
- The adjusted plan must cover all 7 days of the week.
- Ensure the adjusted plan maintains proper muscle group balance and workout frequency.
- The output for 'adjustedWorkoutPlanJson' MUST be a valid JSON string representing the full 7-day plan.

User Profile:
{{{userProfileJson}}}

Current Weekly Workout Plan:
{{{currentWorkoutPlanJson}}}

Completed Workouts Data (Performance Logs & Notes):
{{{completedWorkoutsJson}}}

Based on this information, provide an adjusted 7-day workout plan and a summary of the changes.`,
});

const adjustWorkoutPlanFlow = ai.defineFlow(
  {
    name: 'adjustWorkoutPlanFlow',
    inputSchema: AdjustWorkoutPlanInputSchema,
    outputSchema: AdjustWorkoutPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('No output received from the AI model.');
    }
    // Validate that the adjustedWorkoutPlanJson is actually valid JSON
    try {
      JSON.parse(output.adjustedWorkoutPlanJson);
    } catch (e) {
      console.error('AI model generated invalid JSON for adjustedWorkoutPlanJson:', e);
      throw new Error('The AI model failed to produce a valid JSON workout plan. Please try again.');
    }
    return output;
  }
);
