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
import type { PersonalRecord } from '@/lib/types';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

const { firestore } = initializeFirebase();

const getPersonalRecordsRef = (userId: string) =>
  collection(firestore, 'users', userId, 'personalRecords');

export const addPersonalRecord = async (
  userId: string,
  record: Omit<PersonalRecord, 'id' | 'date'>
): Promise<PersonalRecord | null> => {
  const recordData = {
    ...record,
    date: new Date().toISOString(),
    createdAt: serverTimestamp(),
  };
  try {
    const docRef = await addDoc(getPersonalRecordsRef(userId), recordData);
    return { id: docRef.id, ...record, date: recordData.date };
  } catch (error) {
    console.error('Error adding personal record:', error);
    const contextualError = new FirestorePermissionError({
      operation: 'create',
      path: `users/${userId}/personalRecords`,
      requestResourceData: recordData,
    });
    errorEmitter.emit('permission-error', contextualError);
    return null;
  }
};

export const getPersonalRecords = async (
  userId: string
): Promise<PersonalRecord[]> => {
  try {
    const q = query(getPersonalRecordsRef(userId), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    const records: PersonalRecord[] = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() } as PersonalRecord);
    });
    return records;
  } catch (error) {
    console.error('Error getting personal records:', error);
    const contextualError = new FirestorePermissionError({
      operation: 'list',
      path: `users/${userId}/personalRecords`,
    });
    errorEmitter.emit('permission-error', contextualError);
    return [];
  }
};

export const deletePersonalRecord = async (userId: string, recordId: string) => {
  const docRef = doc(firestore, 'users', userId, 'personalRecords', recordId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting personal record:', error);
    const contextualError = new FirestorePermissionError({
      operation: 'delete',
      path: `users/${userId}/personalRecords/${recordId}`,
    });
    errorEmitter.emit('permission-error', contextualError);
    throw error;
  }
};

export const clearPersonalRecords = async (userId: string) => {
  const querySnapshot = await getDocs(getPersonalRecordsRef(userId));
  if (querySnapshot.empty) return;
  const batch = writeBatch(firestore);
  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit().catch((error) => {
    console.error('Error clearing personal records:', error);
    const contextualError = new FirestorePermissionError({
      operation: 'delete',
      path: `users/${userId}/personalRecords`,
    });
    errorEmitter.emit('permission-error', contextualError);
  });
}
