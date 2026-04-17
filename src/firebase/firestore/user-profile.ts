'use client';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';

const { firestore } = initializeFirebase();

const getProfileRef = (userId: string) => doc(firestore, 'users', userId);

export const saveUserProfile = async (userId: string, profile: UserProfile) => {
  const profileWithId = { ...profile, id: userId };
  try {
    await setDoc(getProfileRef(userId), profileWithId, { merge: true });
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const docSnap = await getDoc(getProfileRef(userId));
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const deleteUserProfile = async (userId: string) => {
  try {
    await deleteDoc(getProfileRef(userId));
  } catch (error) {
    console.error('Error deleting user profile:', error);
    throw error;
  }
};
