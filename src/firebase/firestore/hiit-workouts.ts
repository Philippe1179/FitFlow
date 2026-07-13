'use client';
import {
  doc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  collection,
  writeBatch,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { HiitWorkout } from '@/lib/types';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

const { firestore } = initializeFirebase();

const getHiitWorkoutsRef = (userId: string) =>
  collection(firestore, 'users', userId, 'hiitWorkouts');

export const saveHiitWorkout = async (
  userId: string,
  workout: Omit<HiitWorkout, 'id'> & { id?: string }
): Promise<HiitWorkout> => {
  if (workout.id) {
    const workoutRef = doc(firestore, 'users', userId, 'hiitWorkouts', workout.id);
    await setDoc(workoutRef, workout, { merge: true }).catch((error) => {
      console.error('Error saving HIIT workout (update):', error);
      const contextualError = new FirestorePermissionError({
        operation: 'write',
        path: workoutRef.path,
        requestResourceData: workout,
      });
      errorEmitter.emit('permission-error', contextualError);
      throw error;
    });
    return workout as HiitWorkout;
  } else {
    const workoutsRef = getHiitWorkoutsRef(userId);
    try {
      const docRef = await addDoc(workoutsRef, workout);
      return { ...workout, id: docRef.id };
    } catch (error) {
      console.error('Error saving HIIT workout (create):', error);
      const contextualError = new FirestorePermissionError({
        operation: 'create',
        path: workoutsRef.path,
        requestResourceData: workout,
      });
      errorEmitter.emit('permission-error', contextualError);
      throw error;
    }
  }
};

export const getHiitWorkouts = async (userId: string): Promise<HiitWorkout[]> => {
  try {
    const querySnapshot = await getDocs(getHiitWorkoutsRef(userId));
    const workouts: HiitWorkout[] = [];
    querySnapshot.forEach((doc) => {
      workouts.push({ id: doc.id, ...doc.data() } as HiitWorkout);
    });
    return workouts;
  } catch (error) {
    console.error('Error getting HIIT workouts:', error);
    const contextualError = new FirestorePermissionError({
      operation: 'list',
      path: `users/${userId}/hiitWorkouts`,
    });
    errorEmitter.emit('permission-error', contextualError);
    return [];
  }
};

export const deleteHiitWorkout = async (userId: string, workoutId: string) => {
  const workoutRef = doc(firestore, 'users', userId, 'hiitWorkouts', workoutId);
  try {
    await deleteDoc(workoutRef);
  } catch (error) {
    console.error('Error deleting HIIT workout:', error);
    const contextualError = new FirestorePermissionError({
      operation: 'delete',
      path: workoutRef.path,
    });
    errorEmitter.emit('permission-error', contextualError);
    throw error;
  }
};

export const clearHiitWorkouts = async (userId: string) => {
  const querySnapshot = await getDocs(getHiitWorkoutsRef(userId));
  if (querySnapshot.empty) return;
  const batch = writeBatch(firestore);
  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit().catch((error) => {
    console.error('Error clearing HIIT workouts:', error);
    const contextualError = new FirestorePermissionError({
      operation: 'delete',
      path: `users/${userId}/hiitWorkouts`,
    });
    errorEmitter.emit('permission-error', contextualError);
  });
};
