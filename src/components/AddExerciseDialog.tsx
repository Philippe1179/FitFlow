'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import type { Exercise } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface AddExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddExercise: (exercise: Exercise) => void;
}

export function AddExerciseDialog({ open, onOpenChange, onAddExercise }: AddExerciseDialogProps) {
  const [name, setName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weightOrOption, setWeightOrOption] = useState('');
  const { toast } = useToast();

  const handleSave = () => {
    const setsNum = parseInt(sets, 10);
    if (!name.trim() || isNaN(setsNum) || setsNum <= 0 || !reps.trim()) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please fill out exercise name, sets, and reps with valid values.',
      });
      return;
    }
    const newExercise: Exercise = {
      name,
      sets: setsNum,
      reps,
      weightOrOption: weightOrOption || 'Bodyweight',
    };
    onAddExercise(newExercise);
    
    // Reset form and close dialog
    setName('');
    setSets('');
    setReps('');
    setWeightOrOption('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Exercise</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ex-name" className="text-right">
              Name
            </Label>
            <Input id="ex-name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" placeholder="e.g. Bench Press" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ex-sets" className="text-right">
              Sets
            </Label>
            <Input id="ex-sets" type="number" value={sets} onChange={e => setSets(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ex-reps" className="text-right">
              Reps
            </Label>
            <Input id="ex-reps" value={reps} onChange={e => setReps(e.target.value)} className="col-span-3" placeholder="e.g. 8-12 or AMRAP"/>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ex-weight" className="text-right">
              Weight
            </Label>
            <Input id="ex-weight" value={weightOrOption} onChange={e => setWeightOrOption(e.target.value)} className="col-span-3" placeholder="e.g. 50kg or Bodyweight" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Add Exercise</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
