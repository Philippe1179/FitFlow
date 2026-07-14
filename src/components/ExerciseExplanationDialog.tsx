'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { getExerciseExplanationAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

interface ExerciseExplanationDialogProps {
  exerciseName: string | null;
  onOpenChange: (open: boolean) => void;
}

export function ExerciseExplanationDialog({
  exerciseName,
  onOpenChange,
}: ExerciseExplanationDialogProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (!exerciseName) return;
    setExplanation(null);
    startTransition(async () => {
      const result = await getExerciseExplanationAction(exerciseName);
      if (result.success && result.data) {
        setExplanation(result.data);
      } else {
        setExplanation(
          'Sorry, we could not fetch an explanation for this exercise at the moment. Please try again later.'
        );
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      }
    });
  }, [exerciseName]);

  return (
    <Dialog open={!!exerciseName} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{exerciseName}</DialogTitle>
          <DialogDescription>A guide to proper form and execution.</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {isLoading || !explanation ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{explanation}</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
