# FitFlow

An AI-powered fitness web app that generates personalized workout plans, tracks your progress, and keeps you on track during workouts — including background push notifications so your rest timer alerts you even while using other apps.

**Live Demo:** https://studio--studio-9772986985-4b343.us-central1.hosted.app/

## Features

- **AI-Generated Workout Plans** — generates personalized weekly plans based on your fitness goals, skill level, available equipment, and preferred workout days
- **Progress Tracking** — log workouts, track sets/reps/weight, and view workout history
- **Rest Timer** — accurate background countdown timer with push notifications that fire even when you switch to another app
- **PWA Support** — installable on iOS and Android, runs as a standalone app with no browser UI
- **AI Exercise Tools** — get explanations for any exercise, swap exercises for alternatives, and adjust plans over time
- **Plan Management** — create and manage multiple workout plans
- **Authentication** — Firebase Auth with onboarding flow for new users

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database & Auth**: Firebase (Firestore + Firebase Auth)
- **AI**: Google Genkit with Gemini
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **Notifications**: Service Workers + Web Push API
- **Deployment**: Firebase App Hosting with CI/CD via GitHub

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
