'use client';

import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CelebrationCheckProps {
  size?: number;
  className?: string;
  iconClassName?: string;
  glowClassName?: string;
}

export function CelebrationCheck({
  size = 80,
  className,
  iconClassName = 'text-accent',
  glowClassName = 'bg-accent',
}: CelebrationCheckProps) {
  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <span className={cn('absolute inset-0 rounded-full opacity-30 animate-ping', glowClassName)} />
      <span
        className={cn(
          'absolute inset-2 rounded-full opacity-20 animate-ping [animation-delay:200ms]',
          glowClassName
        )}
      />
      <CheckCircle2
        className={cn('relative animate-in zoom-in-50 duration-500', iconClassName)}
        style={{ width: size * 0.7, height: size * 0.7 }}
      />
    </div>
  );
}
