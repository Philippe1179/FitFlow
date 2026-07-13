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
import type { CardioLogEntry } from '@/lib/types';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

const { firestore } = initializeFirebase();

const getCardioLogRef = (userId: string) =>
  collection(firestore, 'users', userId, 'cardioLogEntries');

export const addCardioLogEntry = async (
  userId: string,
  entry: Omit<CardioLogEntry, 'id' | 'date'>
): Promise<CardioLogEntry | null> => {
  const entryData = {
    ...entry,
    date: new Date().toISOString(),
    createdAt: serverTimestamp(),
  };
  try {
    const docRef = await addDoc(getCardioLogRef(userId), entryData);
    return { id: docRef.id, ...entry, date: entryData.date };
  } catch (error) {
    console.error('Error adding cardio log entry:', error);
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      operation: 'create',
      path: `users/${userId}/cardioLogEntries`,
      requestResourceData: entryData,
    }));
    return null;
  }
};

export const getCardioLogEntries = async (userId: string): Promise<CardioLogEntry[]> => {
  try {
    const q = query(getCardioLogRef(userId), orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CardioLogEntry));
  } catch (error) {
    console.error('Error getting cardio log entries:', error);
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      operation: 'list',
      path: `users/${userId}/cardioLogEntries`,
    }));
    return [];
  }
};

export const deleteCardioLogEntry = async (userId: string, entryId: string) => {
  try {
    await deleteDoc(doc(firestore, 'users', userId, 'cardioLogEntries', entryId));
  } catch (error) {
    console.error('Error deleting cardio log entry:', error);
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      operation: 'delete',
      path: `users/${userId}/cardioLogEntries/${entryId}`,
    }));
    throw error;
  }
};

export const clearCardioLogEntries = async (userId: string) => {
  const snapshot = await getDocs(getCardioLogRef(userId));
  if (snapshot.empty) return;
  const batch = writeBatch(firestore);
  snapshot.forEach((d) => batch.delete(d.ref));
  await batch.commit().catch((error) => {
    console.error('Error clearing cardio log entries:', error);
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      operation: 'delete',
      path: `users/${userId}/cardioLogEntries`,
    }));
  });
};
