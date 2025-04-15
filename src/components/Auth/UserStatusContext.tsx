"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { UserStatusType } from '@/types/user-status';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from './AuthContext';
import { Database } from '@/types/database';

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
  myStatus: UserStatusType;
  setMyStatus: (status: UserStatusType) => Promise<void>;
  userStatuses: Record<string, UserStatusType>;
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
  const supabase = createClientComponentClient<Database>();
  const { user } = useAuth();
  const [myStatus, setMyStatusState] = useState<UserStatusType>('online');
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatusType>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store current status in a ref to access in callbacks without dependencies
  const myStatusRef = useRef<UserStatusType>(myStatus);
  // Store user statuses in a ref to avoid dependency issues
  const userStatusesRef = useRef<Record<string, UserStatusType>>(userStatuses);
  
  // Update refs when state changes
  useEffect(() => {
    myStatusRef.current = myStatus;
  }, [myStatus]);
  
  useEffect(() => {
    userStatusesRef.current = userStatuses;
  }, [userStatuses]);

  // Function to track user activity
  const updateUserActivity = () => {
    lastActivityRef.current = Date.now();
    
    // Always update the last_updated timestamp to prevent being marked as inactive
    if (user) {
      try {
        // If user is not in do_not_disturb, set them to online
        if (myStatusRef.current !== 'do_not_disturb') {
          setMyStatusState('online');
          void supabase
            .from('user_status')
            .update({
              status: 'online',
              last_updated: new Date().toISOString(),
            })
            .eq('user_id', user.id);
          console.log('User activity detected, status updated to online');
        } else {
          // Just update the timestamp for do_not_disturb users
          void supabase
            .from('user_status')
            .update({
              last_updated: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.error('Error updating user activity:', error);
      }
    }
  };

  // Function to update user's status in the database
  const setMyStatus = async (status: UserStatusType) => {
    if (!user) return;
    
    // Skip if status hasn't changed
    if (status === myStatusRef.current) return;

    try {
      console.log(`Setting status to: ${status}`);
      
      // First update UI state for immediate feedback
      setMyStatusState(status);
      
      // Try to update first to avoid conflicts
      const { data: existingStatus, error: checkError } = await supabase
        .from('user_status')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing status:', checkError);
      }
      
      let updateError;
      
      if (existingStatus) {
        // If record exists, do an update instead of upsert
        const { error } = await supabase
          .from('user_status')
          .update({
            status,
            last_updated: new Date().toISOString()
          })
          .eq('user_id', user.id);
          
        updateError = error;
      } else {
        // If no record exists, do an insert
        const { error } = await supabase
          .from('user_status')
          .insert({
            user_id: user.id,
            status,
            last_updated: new Date().toISOString()
          });
          
        updateError = error;
      }

      if (updateError) {
        console.error('Error updating status:', updateError);
        // If failed, attempt to use API endpoint as fallback
        try {
          const response = await fetch('/api/status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              status,
              userId: user.id 
            }),
          });
          
          if (!response.ok) {
            throw new Error(`API status update failed: ${response.statusText}`);
          }
        } catch (apiError) {
          console.error('API fallback error:', apiError);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Check for inactivity
  const checkInactivity = useCallback(() => {
    const inactiveTime = Date.now() - lastActivityRef.current;
    
    if (inactiveTime >= INACTIVITY_THRESHOLD && myStatusRef.current !== 'offline' && user) {
      console.log('User inactive for 5 minutes, setting status to offline');
      setMyStatus('offline');
    }
  }, [user]);

  // Function to check and update inactive users
  const checkAndUpdateInactiveUsers = useCallback(async () => {
    if (!user) return;
    
    const now = new Date();
    const inactivityTimestamp = new Date(now.getTime() - INACTIVITY_THRESHOLD).toISOString();
    
    try {
      // Get all users who were last active more than 5 minutes ago and are not already offline
      const { data: inactiveUsers, error: fetchError } = await supabase
        .from('user_status')
        .select('user_id')
        .lt('last_updated', inactivityTimestamp)
        .neq('status', 'offline');
      
      if (fetchError) {
        console.error('Error fetching inactive users:', fetchError);
        return;
      }
      
      if (inactiveUsers && inactiveUsers.length > 0) {
        // Extract user IDs
        const userIds = inactiveUsers.map(u => u.user_id);
        console.log(`Found ${userIds.length} inactive users to update to offline status`);
        
        // Update all inactive users to offline in a single batch operation
        const { error: updateError } = await supabase
          .from('user_status')
          .update({
            status: 'offline',
            last_updated: now.toISOString()
          })
          .in('user_id', userIds);
        
        if (updateError) {
          console.error('Error updating inactive users:', updateError);
        } else {
          // Update local state with the changes - use a callback to avoid dependency issues
          setUserStatuses(prevStatuses => {
            const updatedStatusMap = { ...prevStatuses };
            userIds.forEach(userId => {
              updatedStatusMap[userId] = 'offline';
            });
            return updatedStatusMap;
          });
        }
      }
    } catch (error) {
      console.error('Error in automatic inactive user update:', error);
    }
  }, [user, supabase]);

  const fetchInitialStatuses = useCallback(async () => {
    try {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      console.log('Fetching initial status');
      
      // First fetch current user's status
      const { data: myStatusData, error: myStatusError } = await supabase
        .from('user_status')
        .select('status')
        .eq('user_id', user.id)
        .single();

      if (myStatusError && myStatusError.code !== 'PGRST116') {
        console.error('Error fetching my status:', myStatusError);
      }

      if (myStatusData) {
        // Only auto-set to online if this is the initial load and status is offline
        if (myStatusData.status === 'offline' && isInitialLoad) {
          console.log('User was previously offline, setting to online');
          // Update state without recursive call
          setMyStatusState('online');
          
          // Update database directly
          await supabase
            .from('user_status')
            .update({
              status: 'online',
              last_updated: new Date().toISOString()
            })
            .eq('user_id', user.id);
        } else {
          // Just update the state without making another database call
          setMyStatusState(myStatusData.status as UserStatusType);
        }
      } else {
        // If no status found, just update local state and database directly
        console.log('No status found, setting to online');
        setMyStatusState('online');
        
        // Insert directly
        await supabase
          .from('user_status')
          .insert({
            user_id: user.id,
            status: 'online',
            last_updated: new Date().toISOString()
          });
      }

      // Mark initial load as complete - only do this once successfully initialized
      setIsInitialLoad(false);
      
      // Run the initial check for inactive users
      await checkAndUpdateInactiveUsers();
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchInitialStatuses:', error);
      setIsLoading(false);
    }
  }, [user, supabase, isInitialLoad, checkAndUpdateInactiveUsers]);

  // Function to set user status to offline
  const setUserOffline = (userId: string) => {
    // Only update database, don't modify state during cleanup
    supabase
      .from('user_status')
      .update({
        status: 'offline',
        last_updated: new Date().toISOString(),
      })
      .eq('user_id', userId);
  };

  // Set up a heartbeat to update user's online status periodically
  const heartbeat = useCallback(async () => {
    if (!user || myStatusRef.current === 'offline') return;
    
    try {
      // Use update instead of upsert for the heartbeat
      const { data: existingStatus } = await supabase
        .from('user_status')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (existingStatus) {
        await supabase
          .from('user_status')
          .update({
            status: myStatusRef.current,
            last_updated: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_status')
          .insert({
            user_id: user.id,
            status: myStatusRef.current,
            last_updated: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Error in heartbeat:', error);
    }
  }, [user, supabase]);

  // Main effect for setting up listeners and subscriptions
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    console.log('UserStatusContext: Setting up user status monitoring');

    // Track user activity events - comprehensive list to catch all interactions
    const activityEvents = [
      'mousedown', 'mouseup', 'mousemove', 
      'keydown', 'keyup', 
      'touchstart', 'touchmove', 'touchend',
      'click', 'dblclick',
      'scroll', 'wheel', 
      'focus', 'blur',
      'input', 'change', 'submit'
    ];
    
    // Debounced version to avoid too many updates
    let activityTimeout: NodeJS.Timeout | null = null;
    
    const debouncedUpdateActivity = () => {
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      
      activityTimeout = setTimeout(() => {
        updateUserActivity();
      }, 300); // 300ms debounce
    };
    
    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, debouncedUpdateActivity, { passive: true });
    });
    
    // Start inactivity check timer
    inactivityTimerRef.current = setInterval(checkInactivity, INACTIVITY_CHECK_INTERVAL);

    let inactiveUsersCheckInterval: NodeJS.Timeout | null = null;
    
    // Only fetch initial statuses on first load
    if (isInitialLoad) {
      fetchInitialStatuses();
    }
    
    // Set up a regular check for inactive users - regardless of initial load status
    inactiveUsersCheckInterval = setInterval(checkAndUpdateInactiveUsers, HEARTBEAT_INTERVAL);

    // Set up Supabase subscription to listen for status changes
    const statusSubscription = supabase
      .channel('user_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status',
          filter: user ? `user_id=eq.${user.id}` : undefined,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { user_id, status } = payload.new as { user_id: string; status: UserStatusType };
            
            // Update my status if it's my update
            if (user_id === user?.id) {
              setMyStatusState(status);
            }
            
            // Update the statuses map
            setUserStatuses((prev) => ({
              ...prev,
              [user_id]: status,
            }));
          }
        }
      )
      .subscribe();

    // Setup a separate channel for other users' status changes
    const otherUsersSubscription = supabase
      .channel('other_users_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status',
          filter: user ? `user_id=neq.${user.id}` : undefined,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { user_id, status } = payload.new as { user_id: string; status: UserStatusType };
            
            // Update the statuses map
            setUserStatuses((prev) => ({
              ...prev,
              [user_id]: status,
            }));
          }
        }
      )
      .subscribe();

    // Set user to offline when they close the window/tab
    const handleBeforeUnload = () => {
      if (user) {
        // Using fetch directly for synchronous operation before unload
        fetch('/api/status/offline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
          keepalive: true, // Important to ensure the request completes
        }).catch(console.error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Set up a heartbeat to update user's online status periodically
    const heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    // Comprehensive cleanup function
    return () => {
      console.log('UserStatusContext: Cleaning up status monitoring');
      
      // Unsubscribe from Supabase channels
      statusSubscription.unsubscribe();
      otherUsersSubscription.unsubscribe();
      
      // Remove event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      activityEvents.forEach(event => {
        window.removeEventListener(event, debouncedUpdateActivity);
      });
      
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      
      // Clear all intervals
      clearInterval(heartbeatInterval);
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (inactiveUsersCheckInterval) {
        clearInterval(inactiveUsersCheckInterval);
      }
      
      // If user is logging out, set status to offline
      if (user) {
        setUserOffline(user.id);
      }
    };
  }, [
    user, 
    isInitialLoad, 
    fetchInitialStatuses, 
    checkInactivity,
    checkAndUpdateInactiveUsers,
    heartbeat
  ]);

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