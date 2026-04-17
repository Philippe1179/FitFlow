'use client';
import { collection, addDoc, getDocs, writeBatch, query, getFirestore, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { CompletedWorkout } from '@/lib/types';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

const { firestore } = initializeFirebase();

const getCompletedWorkoutsRef = (userId: string) => collection(firestore, 'users', userId, 'completedWorkouts');

export const addCompletedWorkout = async (userId: string, workout: Omit<CompletedWorkout, 'id'>): Promise<CompletedWorkout | null> => {
  const workoutData = { ...workout, userId, createdAt: serverTimestamp() };
  try {
    const docRef = await addDoc(getCompletedWorkoutsRef(userId), workoutData);
    return { id: docRef.id, ...workout }
  } catch (error) {
    console.error('Error adding completed workout:', error);
     const contextualError = new FirestorePermissionError({
      operation: 'create',
      path: `users/${userId}/completedWorkouts`,
      requestResourceData: workoutData,
    })
    errorEmitter.emit('permission-error', contextualError);
    return null;
  }
};

export const getCompletedWorkouts = async (userId: string): Promise<CompletedWorkout[]> => {
  try {
    const q = query(getCompletedWorkoutsRef(userId));
    const querySnapshot = await getDocs(q);
    const workouts: CompletedWorkout[] = [];
    querySnapshot.forEach((doc) => {
      workouts.push({ id: doc.id, ...doc.data() } as CompletedWorkout);
    });
    return workouts;
  } catch (error) {
    console.error('Error getting completed workouts:', error);
     const contextualError = new FirestorePermissionError({
      operation: 'list',
      path: `users/${userId}/completedWorkouts`,
    })
    errorEmitter.emit('permission-error', contextualError);
    return [];
  }
};

export const deleteCompletedWorkout = async (userId: string, workoutId: string) => {
    const workoutRef = doc(firestore, 'users', userId, 'completedWorkouts', workoutId);
    try {
        await deleteDoc(workoutRef);
    } catch(error) {
        console.error('Error deleting completed workout:', error);
        const contextualError = new FirestorePermissionError({
            operation: 'delete',
            path: `users/${userId}/completedWorkouts/${workoutId}`,
        });
        errorEmitter.emit('permission-error', contextualError);
        throw error;
    }
}

export const clearCompletedWorkouts = async (userId: string) => {
    const q = query(getCompletedWorkoutsRef(userId));
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(firestore);
    querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit().catch(error => {
       console.error('Error clearing completed workouts:', error);
       const contextualError = new FirestorePermissionError({
        operation: 'delete',
        path: `users/${userId}/completedWorkouts`,
      })
      errorEmitter.emit('permission-error', contextualError);
    });
}
