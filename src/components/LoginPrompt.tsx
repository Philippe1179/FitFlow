import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';

export default function LoginPrompt() {
  return (
    <div className="flex items-center justify-center h-full p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <CardTitle>Welcome to FitFlow</CardTitle>
          <CardDescription>
            Please sign in to access your personalized fitness journey. Use the
            "Sign In" button in the top-right corner.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
