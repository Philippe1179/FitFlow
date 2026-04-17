'use client';
import {
  getFirestore,
  doc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  collection,
  writeBatch,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { WorkoutPlan } from '@/lib/types';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

const { firestore } = initializeFirebase();

const getPlansRef = (userId: string) =>
  collection(firestore, 'users', userId, 'workoutPlans');

export const saveWorkoutPlan = async (
  userId: string,
  plan: Omit<WorkoutPlan, 'id'> & { id?: string }
): Promise<WorkoutPlan> => {
  if (plan.id) {
    // Update existing plan
    const planRef = doc(firestore, 'users', userId, 'workoutPlans', plan.id);
    await setDoc(planRef, plan, { merge: true }).catch((error) => {
      console.error('Error saving workout plan (update):', error);
      const contextualError = new FirestorePermissionError({
        operation: 'write',
        path: planRef.path,
        requestResourceData: plan,
      });
      errorEmitter.emit('permission-error', contextualError);
      throw error;
    });
    return plan as WorkoutPlan;
  } else {
    // Add new plan
    const plansRef = getPlansRef(userId);
    try {
      const docRef = await addDoc(plansRef, plan);
      return { ...plan, id: docRef.id };
    } catch (error) {
      console.error('Error saving workout plan (create):', error);
      const contextualError = new FirestorePermissionError({
        operation: 'create',
        path: plansRef.path,
        requestResourceData: plan,
      });
      errorEmitter.emit('permission-error', contextualError);
      throw error;
    }
  }
};

export const getWorkoutPlans = async (
  userId: string
): Promise<WorkoutPlan[]> => {
  try {
    const querySnapshot = await getDocs(getPlansRef(userId));
    const plans: WorkoutPlan[] = [];
    querySnapshot.forEach((doc) => {
      plans.push({ id: doc.id, ...doc.data() } as WorkoutPlan);
    });
    return plans;
  } catch (error) {
    console.error('Error getting workout plans:', error);
    const contextualError = new FirestorePermissionError({
      operation: 'list',
      path: `users/${userId}/workoutPlans`,
    });
    errorEmitter.emit('permission-error', contextualError);
    return [];
  }
};

export const deleteWorkoutPlan = async (userId: string, planId: string) => {
  const planRef = doc(firestore, 'users', userId, 'workoutPlans', planId);
  try {
    await deleteDoc(planRef);
  } catch (error) {
    console.error('Error deleting workout plan:', error);
    const contextualError = new FirestorePermissionError({
      operation: 'delete',
      path: planRef.path,
    });
    errorEmitter.emit('permission-error', contextualError);
    throw error;
  }
};

export const clearWorkoutPlans = async (userId: string) => {
  const querySnapshot = await getDocs(getPlansRef(userId));
  if (querySnapshot.empty) return;
  const batch = writeBatch(firestore);
  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit().catch((error) => {
    console.error('Error clearing workout plans:', error);
    const contextualError = new FirestorePermissionError({
      operation: 'delete',
      path: `users/${userId}/workoutPlans`,
    });
    errorEmitter.emit('permission-error', contextualError);
  });
};
