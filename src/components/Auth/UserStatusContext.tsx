"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { UserStatusValue, UserStatusRecord } from '@/types/user-status'; // Import updated types
import { useAuth } from './AuthContext';
import { Database } from '@/types/database';
import { RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'; // Correct import

// Simple debounce utility function (module scope)
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): { (...args: Parameters<T>): void; cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null; // Clear timeoutId after execution
      func(...args);
    }, wait);
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * UserStatusContext provides real-time user status tracking with automatic offline detection.
 * Features:
 * - Automatically sets users to offline after 5 minutes of inactivity
 * - Uses client-side activity tracking
 * - Maintains statuses with Supabase Realtime
 * - Efficient batch updates for inactive users
 * - Sets user to offline on page close/refresh
 */

interface UserStatusContextType {
  myStatus: UserStatusRecord | null; // Store the full record
  setMyStatus: (status: UserStatusValue, isManual: boolean) => Promise<void>; // Accept isManual flag
  userStatuses: Record<string, UserStatusRecord>; // Store full records for others too
  isLoading: boolean;
  /** Time in milliseconds after which a user is considered inactive */
  inactivityThreshold: number;
}

const INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
const INACTIVITY_CHECK_INTERVAL = 30000; // Check every 30 seconds
const HEARTBEAT_INTERVAL = 60000; // Update heartbeat every minute

const UserStatusContext = createContext<UserStatusContextType | undefined>(undefined);

export const useUserStatus = () => {
  const context = useContext(UserStatusContext);
  if (!context) {
    throw new Error('useUserStatus must be used within a UserStatusProvider');
  }
  return context;
};

interface UserStatusProviderProps {
  children: React.ReactNode;
}

export const UserStatusProvider: React.FC<UserStatusProviderProps> = ({ children }) => {
  const { user, supabase } = useAuth(); // Get supabase from AuthContext
  const [myStatus, setMyStatusState] = useState<UserStatusRecord | null>(null); // Initialize as null
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatusRecord>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to hold the debounced function instance with cancel method
  const debouncedActivityUpdaterRef = useRef<ReturnType<typeof debounce> | null>(null);

  // Store current status record in a ref
  const myStatusRef = useRef<UserStatusRecord | null>(myStatus);
  // Store other user status records in a ref
  const userStatusesRef = useRef<Record<string, UserStatusRecord>>(userStatuses);

  // Update refs when state changes
  useEffect(() => {
    myStatusRef.current = myStatus;
  }, [myStatus]);

  useEffect(() => {
    userStatusesRef.current = userStatuses;
  }, [userStatuses]);

  // Function to update the user's status record in the database
  const updateStatusRecord = useCallback(async (status: UserStatusValue, isManual: boolean) => {
    if (!user || !supabase) return;

    const record: Partial<Database['public']['Tables']['user_status']['Row']> = {
      user_id: user.id,
      status,
      is_manual: isManual,
      last_updated: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('user_status')
        .upsert(record, { onConflict: 'user_id' }); // Use upsert for simplicity

      if (error) {
        console.error('Error upserting status:', error);
        // Implement fallback or retry logic if needed
      }
    } catch (err) {
      console.error('Exception during status upsert:', err);
    }
  }, [user, supabase]);

  // Public function for users to set their status
  const setMyStatus = useCallback(async (status: UserStatusValue, isManual: boolean) => {
    if (!user || !supabase) return;

    // Determine the final manual state: force false if setting to 'online'.
    const finalIsManual = status === 'online' ? false : isManual;

    // 1. Optimistically update local state for instant UI feedback
    const newStatusRecord: UserStatusRecord = {
      user_id: user.id,
      status,
      is_manual: finalIsManual,
      last_updated: new Date().toISOString(), // Use current time for optimistic update
    };
    setMyStatusState(newStatusRecord);

    // 2. Update database asynchronously
    // The realtime listener will eventually confirm or correct this state.
    await updateStatusRecord(status, finalIsManual);

  }, [user, supabase, updateStatusRecord]);

  // Function to track user activity
  const updateUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (!user || !supabase || !myStatusRef.current) return;

    // Only update to 'online' if the current status is not manually set to offline or DND
    if (!myStatusRef.current.is_manual || myStatusRef.current.status === 'online') {
      // Check if status is not already 'online' to avoid unnecessary updates
      if (myStatusRef.current.status !== 'online') {
        console.log('User activity detected, setting status to online (dynamic)');
        setMyStatus('online', false); // Set dynamically
      } else {
        // If already online, just update the timestamp in DB (heartbeat)
        updateStatusRecord(myStatusRef.current.status, myStatusRef.current.is_manual);
      }
    } else {
      // If manually set (offline/dnd), just update the timestamp for heartbeat
      console.log('User activity detected, but status is manual. Updating timestamp only.');
      updateStatusRecord(myStatusRef.current.status, myStatusRef.current.is_manual);
    }
  }, [user, supabase, setMyStatus, updateStatusRecord]);

  // Debounced version of activity update
  const debouncedUpdateActivity = useCallback(() => {
    // Create the debounced function only once and store it in the ref
    if (!debouncedActivityUpdaterRef.current) {
      debouncedActivityUpdaterRef.current = debounce(updateUserActivity, 500); // Debounce by 500ms
    }
    // Call the debounced function via the ref
    debouncedActivityUpdaterRef.current();
  }, [updateUserActivity]); // Dependency ensures debounce is recreated if updateUserActivity changes

  // Check for inactivity
  const checkInactivity = useCallback(() => {
    if (!user || !supabase || !myStatusRef.current) return;

    const inactiveTime = Date.now() - lastActivityRef.current;

    // Only set to offline if inactive AND status is not manually set to offline/DND
    if (
      inactiveTime >= INACTIVITY_THRESHOLD &&
      myStatusRef.current.status !== 'offline' &&
      (!myStatusRef.current.is_manual || myStatusRef.current.status === 'online') // Allow going offline if manual 'online'
    ) {
      console.log('User inactive, setting status to offline (dynamic)');
      setMyStatus('offline', false); // Set dynamically
    }
  }, [user, supabase, setMyStatus]);

  // Function to fetch the initial status for the current user
  const fetchMyInitialStatus = useCallback(async () => {
    if (!user || !supabase) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_status')
        .select('status, is_manual, last_updated')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: Row not found
        console.error('Error fetching initial status:', error);
        setMyStatusState(null); // Or a default status
      } else if (data) {
        setMyStatusState({
          user_id: user.id, // Add user_id
          status: data.status as UserStatusValue,
          is_manual: data.is_manual ?? false, // Default to false if null
          last_updated: data.last_updated
        });
        // If status is not manual 'offline' or 'dnd', ensure it's 'online' on load
        if (!data.is_manual || data.status === 'online') {
          setMyStatus('online', false); // Set to online dynamically on load
        }
      } else {
        // No existing status, set default (online, not manual)
        console.log('No initial status found, setting default (online, dynamic)');
        setMyStatus('online', false);
      }
    } catch (err) {
      console.error('Exception fetching initial status:', err);
      setMyStatusState(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase, setMyStatus]);

  // Function to fetch initial statuses for all users (can be optimized for large numbers)
  const fetchInitialStatuses = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_status')
        .select('user_id, status, is_manual, last_updated');

      if (error) {
        console.error('Error fetching initial statuses:', error);
        setUserStatuses({});
      } else if (data) {
        const statuses: Record<string, UserStatusRecord> = data.reduce((acc: Record<string, UserStatusRecord>, u: Database['public']['Tables']['user_status']['Row']) => {
          if (u.user_id) {
            acc[u.user_id] = {
              user_id: u.user_id, // Add user_id
              status: u.status as UserStatusValue,
              is_manual: u.is_manual ?? false,
              last_updated: u.last_updated
            };
          }
          return acc;
        }, {} as Record<string, UserStatusRecord>);
        setUserStatuses(statuses);
      }
    } catch (err) {
      console.error('Exception fetching initial statuses:', err);
      setUserStatuses({});
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [supabase]);

  // Function to check and update users who haven't sent a heartbeat
  const checkAndUpdateInactiveUsers = useCallback(async () => {
    if (!user || !supabase) return; // Ensure supabase client is available

    const threshold = new Date(Date.now() - HEARTBEAT_INTERVAL * 2).toISOString(); // 2x heartbeat interval for tolerance

    try {
      // Find users whose last_updated is older than the threshold AND are not manually offline/DND
      const { data: inactiveUsers, error: fetchError } = await supabase
        .from('user_status')
        .select('user_id')
        .lt('last_updated', threshold)
        .eq('status', 'online') // Only consider those currently 'online'
        .eq('is_manual', false); // Only consider dynamically managed ones

      if (fetchError) {
        console.error('Error fetching potentially inactive users:', fetchError);
        return;
      }

      if (inactiveUsers && inactiveUsers.length > 0) {
        const userIdsToUpdate = inactiveUsers.map((u: { user_id: string }) => u.user_id);
        console.log(`Found ${userIdsToUpdate.length} inactive users, setting to offline:`, userIdsToUpdate);

        // Batch update their status to offline
        const { error: updateError } = await supabase
          .from('user_status')
          .update({ status: 'offline', is_manual: false, last_updated: new Date().toISOString() })
          .in('user_id', userIdsToUpdate);

        if (updateError) {
          console.error('Error batch updating inactive users:', updateError);
        }
      }
    } catch (err) {
      console.error('Exception checking/updating inactive users:', err);
    }
  }, [user, supabase]);

  // Main effect for setting up listeners and subscriptions
  useEffect(() => {
    if (!user || !supabase) {
      console.log('UserStatusProvider: User or Supabase client not available yet.');
      setIsLoading(false);
      setMyStatusState(null);
      setUserStatuses({});
      return;
    }

    console.log('UserStatusContext: Setting up user status monitoring');

    // Fetch initial status for the current user
    fetchMyInitialStatus();

    // Set up activity tracking
    const activityEvents = [
      'mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'
      // Add other relevant events as needed, avoid overly frequent ones like mousemove without debounce
    ];

    activityEvents.forEach(event => {
      window.addEventListener(event, debouncedUpdateActivity, { passive: true });
    });

    // Start inactivity check timer
    inactivityTimerRef.current = setInterval(checkInactivity, INACTIVITY_CHECK_INTERVAL);

    // Set up a regular check for users who haven't sent a heartbeat
    const inactiveUsersCheckInterval = setInterval(checkAndUpdateInactiveUsers, HEARTBEAT_INTERVAL);

    // Set up Supabase subscription
    const channel = supabase
      .channel('user_status_changes')
    
    const subscription = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_status',
        // No filter here, receive all changes and handle locally
      },
      (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['user_status']['Row']>) => { 
        let changedRecord: UserStatusRecord | null = null;
        let userIdChanged: string | null = null;

        if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
          const newRecord = payload.new;
          if (newRecord.user_id && newRecord.status && newRecord.last_updated) {
            changedRecord = {
              user_id: newRecord.user_id, // Add user_id
              status: newRecord.status as UserStatusValue,
              is_manual: newRecord.is_manual ?? false,
              last_updated: newRecord.last_updated
            };
            userIdChanged = newRecord.user_id;
          }
        } else if (payload.eventType === 'DELETE' && payload.old) {
          // Handle delete: mark as offline or remove from local state
          const oldRecord = payload.old;
          if (oldRecord?.user_id) {
            userIdChanged = oldRecord.user_id;
            // Set to a default offline state or remove completely
            changedRecord = { 
              user_id: oldRecord.user_id, // Add user_id
              status: 'offline', 
              is_manual: false, 
              last_updated: new Date().toISOString() 
            };
          }
        }

        if (userIdChanged && changedRecord) {
          if (userIdChanged === user.id) {
            // Update my own status state only if status or is_manual differs
            const currentState = myStatusRef.current;
            if (
              !currentState || // Update if current state is null
              currentState.status !== changedRecord.status ||
              currentState.is_manual !== changedRecord.is_manual
            ) {
              console.log('Updating my status from realtime:', changedRecord); // Optional: Keep for debugging if needed
              setMyStatusState(changedRecord);
            }
          } else {
            // Update other user's status (consider comparing here too if needed)
            console.log(`Updating status for ${userIdChanged} from realtime:`, changedRecord); // Optional: Keep for debugging
            setUserStatuses(prev => ({
              ...prev,
              [userIdChanged!]: changedRecord!
            }));
          }
        } else if (payload.eventType === 'DELETE' && payload.old?.user_id && payload.old.user_id !== user.id) {
          // Handle deletion of other users more robustly if needed
          console.log(`Removing status for deleted user ${payload.old.user_id}`);
          setUserStatuses(prev => {
            const newState = { ...prev };
            delete newState[payload.old.user_id!];
            return newState;
          });
        }
      }
    )
    .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`, err: Error | null) => { 
      if (err) {
        console.error('Subscription error:', status, err);
      } else {
        console.log('Subscription established with status:', status);
        // Fetch all statuses again on successful subscribe/reconnect
        fetchInitialStatuses();
      }
    });

    // Set user to offline via API when they close the window/tab
    const handleBeforeUnload = async () => {
      if (user && myStatusRef.current && !myStatusRef.current.is_manual) {
        // Only set offline on close if status is dynamic ('online')
        try {
          // Use fetch with keepalive
          await fetch('/api/status/set', { // Assuming this endpoint exists
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, status: 'offline', isManual: false }),
            keepalive: true,
          });
          console.log('Set status to offline via API before unload');
        } catch (error) {
          console.error('Error setting status via API on beforeunload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      console.log('UserStatusContext: Cleaning up status monitoring');

      // Remove event listeners
      activityEvents.forEach(event => {
        window.removeEventListener(event, debouncedUpdateActivity);
      });

      // Clear timers
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }
      // Cancel any pending debounced activity update on cleanup
      if (debouncedActivityUpdaterRef.current?.cancel) {
         debouncedActivityUpdaterRef.current.cancel();
      }

      if (inactiveUsersCheckInterval) {
        clearInterval(inactiveUsersCheckInterval);
      }

      // Cleanup Supabase subscription
      if (subscription) {
        console.log('UserStatusContext: Cleaning up Supabase subscription');
        subscription.unsubscribe();
      }

      // Remove beforeunload listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supabase]); // Rerun effect if user or supabase changes

  // Initial fetch of all statuses (run once after mount)
  useEffect(() => {
    if (user && supabase && isInitialLoad) {
      fetchInitialStatuses();
    }
  }, [user, supabase, isInitialLoad, fetchInitialStatuses]);

  // Expose the context values
  const value = {
    myStatus,
    setMyStatus,
    userStatuses,
    isLoading,
    inactivityThreshold: INACTIVITY_THRESHOLD
  };

  return (
    <UserStatusContext.Provider value={value}>
      {children}
    </UserStatusContext.Provider>
  );
};

export default UserStatusProvider;