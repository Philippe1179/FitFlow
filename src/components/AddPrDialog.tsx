'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

interface AddPrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPrDialog({ open, onOpenChange }: AddPrDialogProps) {
  const { addPersonalRecord, userProfile } = useContext(AppContext);
  const { toast } = useToast();
  const [exerciseName, setExerciseName] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  const handleSave = async () => {
    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps, 10);
    if (!exerciseName.trim() || isNaN(weightNum) || isNaN(repsNum) || weightNum < 0 || repsNum < 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please fill out all fields with valid positive numbers.',
      });
      return;
    }

    let weightInKg = weightNum;
    if (userProfile?.displayWeightUnit === 'lbs') {
      weightInKg = weightNum * 0.453592;
    }

    await addPersonalRecord({
      exerciseName: exerciseName.trim(),
      weight: weightInKg,
      reps: repsNum,
    });

    toast({
      title: 'PR Added!',
      description: `Your new PR for ${exerciseName.trim()} has been saved.`,
    });

    // Reset form and close dialog
    setExerciseName('');
    setWeight('');
    setReps('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Personal Record</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="exerciseName" className="text-right">
              Exercise
            </Label>
            <Input
              id="exerciseName"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              className="col-span-3"
              placeholder="e.g. Bench Press"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="weight" className="text-right">
              Weight ({userProfile?.displayWeightUnit || 'kg'})
            </Label>
            <Input
              id="weight"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reps" className="text-right">
              Reps
            </Label>
            <Input
              id="reps"
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>Save PR</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
