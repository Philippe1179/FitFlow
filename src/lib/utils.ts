import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTodayDayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}
