'use client';

import {
  createContext,
  useState,
  useEffect,
  type ReactNode,
  useCallback,
} from 'react';
import type {
  UserProfile,
  WorkoutPlan,
  CompletedWorkout,
  PersonalRecord,
} from '@/lib/types';
import { useFirebase } from '@/firebase';
import {
  deleteUserProfile,
  getUserProfile,
  saveUserProfile,
} from '@/firebase/firestore/user-profile';
import {
  clearWorkoutPlans,
  deleteWorkoutPlan as fbDeleteWorkoutPlan,
  getWorkoutPlans,
  saveWorkoutPlan,
} from '@/firebase/firestore/workout-plan';
import {
  addCompletedWorkout as fbAddCompletedWorkout,
  clearCompletedWorkouts,
  deleteCompletedWorkout as fbDeleteCompletedWorkout,
  getCompletedWorkouts,
} from '@/firebase/firestore/completed-workouts';
import {
  addPersonalRecord as fbAddPersonalRecord,
  deletePersonalRecord as fbDeletePersonalRecord,
  getPersonalRecords,
  clearPersonalRecords,
} from '@/firebase/firestore/personal-records';
import { useToast } from '@/hooks/use-toast';

interface AppContextType {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  activePlan: WorkoutPlan | null;
  allPlans: WorkoutPlan[];
  savePlan: (plan: WorkoutPlan) => Promise<WorkoutPlan | undefined>;
  deletePlan: (planId: string) => Promise<void>;
  setActivePlan: (planId: string) => Promise<void>;
  addNewPlan: (
    planData: Omit<WorkoutPlan, 'id' | 'name'>,
    name: string,
    setActive?: boolean
  ) => Promise<WorkoutPlan | undefined>;
  completedWorkouts: CompletedWorkout[];
  addCompletedWorkout: (workout: CompletedWorkout) => void;
  deleteCompletedWorkout: (workoutId: string) => Promise<void>;
  personalRecords: PersonalRecord[];
  addPersonalRecord: (
    record: Omit<PersonalRecord, 'id' | 'date'>
  ) => Promise<void>;
  deletePersonalRecord: (recordId: string) => Promise<void>;
  isLoading: boolean;
  clearAllData: () => Promise<void>;
}

export const AppContext = createContext<AppContextType>({
  userProfile: null,
  setUserProfile: () => {},
  activePlan: null,
  allPlans: [],
  savePlan: async () => undefined,
  deletePlan: async () => {},
  setActivePlan: async () => {},
  addNewPlan: async () => undefined,
  completedWorkouts: [],
  addCompletedWorkout: () => {},
  deleteCompletedWorkout: async () => {},
  personalRecords: [],
  addPersonalRecord: async () => {},
  deletePersonalRecord: async () => {},
  isLoading: true,
  clearAllData: async () => {},
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: userLoading, areServicesAvailable } = useFirebase();
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [activePlan, setActivePlanState] = useState<WorkoutPlan | null>(null);
  const [allPlans, setAllPlansState] = useState<WorkoutPlan[]>([]);
  const [completedWorkouts, setCompletedWorkouts] = useState<
    CompletedWorkout[]
  >([]);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      if (user && areServicesAvailable) {
        setIsLoading(true);
        try {
          const [profile, plans, completed, records] = await Promise.all([
            getUserProfile(user.uid),
            getWorkoutPlans(user.uid),
            getCompletedWorkouts(user.uid),
            getPersonalRecords(user.uid),
          ]);
          setUserProfileState(profile);
          setAllPlansState(plans);
          if (profile?.activePlanId) {
            const active = plans.find((p) => p.id === profile.activePlanId);
            setActivePlanState(active || plans[0] || null);
          } else if (plans.length > 0) {
            setActivePlanState(plans[0]);
          } else {
            setActivePlanState(null);
          }
          setCompletedWorkouts(completed);
          setPersonalRecords(records);
        } catch (error) {
          console.error('Failed to load data from Firestore', error);
        } finally {
          setIsLoading(false);
        }
      } else if (!userLoading && areServicesAvailable) {
        setUserProfileState(null);
        setActivePlanState(null);
        setAllPlansState([]);
        setCompletedWorkouts([]);
        setPersonalRecords([]);
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, userLoading, areServicesAvailable]);

  const setUserProfile = useCallback(
    (profile: UserProfile | null) => {
      setUserProfileState(profile);
      if (user && profile) {
        saveUserProfile(user.uid, profile);
      }
    },
    [user]
  );

  const setActivePlan = useCallback(
    async (planId: string) => {
      if (!user || !userProfile) return;
      const newActivePlan = allPlans.find((p) => p.id === planId);
      if (newActivePlan) {
        setActivePlanState(newActivePlan);
        await saveUserProfile(user.uid, {
          ...userProfile,
          activePlanId: planId,
        });
      }
    },
    [user, userProfile, allPlans]
  );

  const savePlan = useCallback(
    async (plan: WorkoutPlan) => {
      if (!user) return;
      try {
        const savedPlan = await saveWorkoutPlan(user.uid, plan);
        setAllPlansState((prev) => {
          const existing = prev.find((p) => p.id === savedPlan.id);
          if (existing) {
            return prev.map((p) => (p.id === savedPlan.id ? savedPlan : p));
          }
          return [...prev, savedPlan];
        });
        if (activePlan?.id === savedPlan.id) {
          setActivePlanState(savedPlan);
        }
        return savedPlan;
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error Saving Plan',
          description: 'Could not save the workout plan. Please try again.',
        });
      }
    },
    [user, activePlan?.id, toast]
  );

  const addNewPlan = useCallback(
    async (
      planData: Omit<WorkoutPlan, 'id' | 'name'>,
      name: string,
      setActive: boolean = false
    ) => {
      if (!user || !userProfile) return;
      const newPlan: Omit<WorkoutPlan, 'id'> = { ...planData, name };
      const savedPlan = await savePlan(newPlan);
      if (savedPlan && (setActive || allPlans.length === 0)) {
        await setActivePlan(savedPlan.id!);
      }
      return savedPlan;
    },
    [user, userProfile, savePlan, allPlans, setActivePlan]
  );

  const deletePlan = useCallback(
    async (planId: string) => {
      if (!user) return;
      try {
        await fbDeleteWorkoutPlan(user.uid, planId);
        let newActivePlan: WorkoutPlan | null = null;
        const remainingPlans = allPlans.filter((p) => p.id !== planId);
        setAllPlansState(remainingPlans);

        if (activePlan?.id === planId) {
          newActivePlan = remainingPlans[0] || null;
          setActivePlanState(newActivePlan);
          await saveUserProfile(user.uid, {
            ...userProfile!,
            activePlanId: newActivePlan?.id || '',
          });
        }

        toast({
          title: 'Plan Deleted',
          description: 'The workout plan has been successfully deleted.',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error Deleting Plan',
          description: 'Could not delete the workout plan. Please try again.',
        });
      }
    },
    [user, activePlan, allPlans, toast, userProfile]
  );

  const addCompletedWorkout = useCallback(
    (workout: CompletedWorkout) => {
      if (user) {
        fbAddCompletedWorkout(user.uid, workout).then((newWorkout) => {
          if (newWorkout) {
            setCompletedWorkouts((prev) => [...prev, newWorkout]);
          }
        });
      }
    },
    [user]
  );

  const deleteCompletedWorkout = useCallback(
    async (workoutId: string) => {
      if (user) {
        try {
          await fbDeleteCompletedWorkout(user.uid, workoutId);
          setCompletedWorkouts((prev) =>
            prev.filter((w) => w.id !== workoutId)
          );
          toast({
            title: 'Workout Deleted',
            description:
              'The selected workout has been removed from your history.',
          });
        } catch (e) {
          console.error('Failed to delete workout', e);
          toast({
            variant: 'destructive',
            title: 'Error Deleting Workout',
            description: 'Could not delete the workout. Please try again.',
          });
        }
      }
    },
    [user, toast]
  );

  const addPersonalRecord = useCallback(
    async (record: Omit<PersonalRecord, 'id' | 'date'>) => {
      if (user) {
        const newRecord = await fbAddPersonalRecord(user.uid, record);
        if (newRecord) {
          setPersonalRecords((prev) =>
            [newRecord, ...prev].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
          );
        }
      }
    },
    [user]
  );

  const deletePersonalRecord = useCallback(
    async (recordId: string) => {
      if (user) {
        try {
          await fbDeletePersonalRecord(user.uid, recordId);
          setPersonalRecords((prev) => prev.filter((r) => r.id !== recordId));
        } catch (e) {
          console.error('Failed to delete PR', e);
          toast({
            variant: 'destructive',
            title: 'Error deleting PR',
            description: 'Could not delete personal record. Please try again.',
          });
        }
      }
    },
    [user, toast]
  );

  const clearAllData = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      try {
        await Promise.all([
          deleteUserProfile(user.uid),
          clearWorkoutPlans(user.uid),
          clearCompletedWorkouts(user.uid),
          clearPersonalRecords(user.uid),
        ]);
        setUserProfileState(null);
        setActivePlanState(null);
        setAllPlansState([]);
        setCompletedWorkouts([]);
        setPersonalRecords([]);
      } catch (error) {
        console.error('Failed to clear data', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [user]);

  return (
    <AppContext.Provider
      value={{
        userProfile,
        setUserProfile,
        activePlan: activePlan,
        allPlans,
        savePlan,
        deletePlan,
        setActivePlan,
        addNewPlan,
        completedWorkouts,
        addCompletedWorkout,
        deleteCompletedWorkout,
        personalRecords,
        addPersonalRecord,
        deletePersonalRecord,
        isLoading: isLoading || userLoading || !areServicesAvailable,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
