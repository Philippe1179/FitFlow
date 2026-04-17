'use client';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { BodyWeightEntry } from '@/lib/types';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

const { firestore } = initializeFirebase();

const getBodyWeightRef = (userId: string) =>
  collection(firestore, 'users', userId, 'bodyWeightEntries');

export const addBodyWeightEntry = async (
  userId: string,
  weightKg: number
): Promise<BodyWeightEntry | null> => {
  const entryData = {
    weight: weightKg,
    date: new Date().toISOString(),
    createdAt: serverTimestamp(),
  };
  try {
    const docRef = await addDoc(getBodyWeightRef(userId), entryData);
    return { id: docRef.id, weight: weightKg, date: entryData.date };
  } catch (error) {
    console.error('Error adding body weight entry:', error);
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      operation: 'create',
      path: `users/${userId}/bodyWeightEntries`,
      requestResourceData: entryData,
    }));
    return null;
  }
};

export const getBodyWeightEntries = async (userId: string): Promise<BodyWeightEntry[]> => {
  try {
    const q = query(getBodyWeightRef(userId), orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BodyWeightEntry));
  } catch (error) {
    console.error('Error getting body weight entries:', error);
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      operation: 'list',
      path: `users/${userId}/bodyWeightEntries`,
    }));
    return [];
  }
};

export const deleteBodyWeightEntry = async (userId: string, entryId: string) => {
  try {
    await deleteDoc(doc(firestore, 'users', userId, 'bodyWeightEntries', entryId));
  } catch (error) {
    console.error('Error deleting body weight entry:', error);
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      operation: 'delete',
      path: `users/${userId}/bodyWeightEntries/${entryId}`,
    }));
    throw error;
  }
};

export const clearBodyWeightEntries = async (userId: string) => {
  const snapshot = await getDocs(getBodyWeightRef(userId));
  if (snapshot.empty) return;
  const batch = writeBatch(firestore);
  snapshot.forEach((d) => batch.delete(d.ref));
  await batch.commit().catch((error) => {
    console.error('Error clearing body weight entries:', error);
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      operation: 'delete',
      path: `users/${userId}/bodyWeightEntries`,
    }));
  });
};
