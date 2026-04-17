'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, type ReactNode, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

interface NumberPickerDialogProps {
  trigger: ReactNode;
  title: string;
  initialValue: number | string;
  onSave: (value: number) => void;
  incrementSteps: number[];
}

export function NumberPickerDialog({
  trigger,
  title,
  initialValue,
  onSave,
  incrementSteps,
}: NumberPickerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState(String(initialValue || '0'));

  useEffect(() => {
    // When the dialog opens, sync the state with the initial value
    if (isOpen) {
      setCurrentValue(String(initialValue || '0'));
    }
  }, [isOpen, initialValue]);

  const handleSave = () => {
    const numericValue = parseFloat(currentValue);
    if (!isNaN(numericValue)) {
      onSave(numericValue);
    }
    setIsOpen(false);
  };

  const handleValueChange = (amount: number) => {
    setCurrentValue(prev => {
        const newValue = (parseFloat(prev) || 0) + amount;
        // Round to handle floating point issues from adding/subtracting
        const rounded = Math.round(newValue * 100) / 100;
        return String(Math.max(0, rounded));
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xs p-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 my-4">
          <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => handleValueChange(-1)} onMouseDown={(e) => e.preventDefault()}>
            <Minus className="h-6 w-6" />
          </Button>
          <Input 
            type="number" 
            className="text-center text-4xl font-bold h-16 w-28 border-2 focus-visible:ring-primary"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            // Hide the default number input spinners
            style={{ MozAppearance: 'textfield' }}
          />
          <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => handleValueChange(1)} onMouseDown={(e) => e.preventDefault()}>
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
            {[...incrementSteps].reverse().map(step => (
                <Button key={`minus-${step}`} variant="secondary" onClick={() => handleValueChange(-step)} onMouseDown={(e) => e.preventDefault()}>-{step}</Button>
            ))}
            {incrementSteps.map(step => (
                <Button key={`plus-${step}`} variant="secondary" onClick={() => handleValueChange(step)} onMouseDown={(e) => e.preventDefault()}>+{step}</Button>
            ))}
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={handleSave} className="w-full h-12 text-lg">Set</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
