# FitFlow

A personalized workout plan generator and progress tracker built with Next.js, Firebase, and Google Genkit AI.

## Features

- **AI-Generated Workout Plans** — generates personalized weekly plans based on your fitness goals, skill level, available equipment, and preferred workout days
- **Progress Tracking** — log workouts and track progress over time
- **Plan Management** — view, edit, and manage multiple workout plans
- **AI Exercise Tools** — get explanations for exercises, suggest alternatives, and adjust plans based on progress
- **Authentication** — Firebase Auth with onboarding flow for new users

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database & Auth**: Firebase (Firestore + Firebase Auth)
- **AI**: Google Genkit with Gemini
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **Forms**: React Hook Form + Zod

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables — create a `.env.local` file with your Google AI credentials:
   ```
   GOOGLE_GENAI_API_KEY=your_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## AI Development

To run the Genkit AI dev server alongside the app:

```bash
npm run genkit:dev
```
