"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUserStatus } from '@/components/Auth/UserStatusContext';
import { useAuth } from '@/components/Auth/AuthContext';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';
import styles from './page.module.css';
import { Loading } from '@/components/UI';
import { Database } from '@/types/database';
import { UserStatusType } from '@/types/user-status';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Define types based on Database schema
type UserStatusRow = Database['public']['Tables']['user_status']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface UserStatusData {
  user_id: string;
  status: UserStatusType;
  last_updated: string;
  profiles: {
    username: string;
    avatar_url: ProfileRow['avatar_url'];
  } | null;
}

export default function UserStatusMonitor() {
  const { user, supabase } = useAuth(); // Get supabase from context
  const { inactivityThreshold } = useUserStatus();
  const [userStatuses, setUserStatuses] = useState<UserStatusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    online: 0,
    offline: 0,
    doNotDisturb: 0,
    total: 0
  });
  
  // For forcing re-renders to update countdown timers
  const [, setTick] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Renamed for clarity
  const channelRef = useRef<RealtimeChannel | null>(null); // Ref to store the channel

  // Fetch all user statuses
  const fetchUserStatuses = useCallback(async () => {
    if (!supabase) {
      console.warn('fetchUserStatuses: Supabase client not available yet.');
      return;
    }

    try {
      // First, fetch user statuses
      const { data: statusData, error: statusError } = await supabase
        .from('user_status') // Explicitly type the returned data
        .select(`
          user_id,
          status,
          last_updated,
        `)
        .order('last_updated', { ascending: false });

      if (statusError) {
        console.error('Error fetching user statuses:', statusError);
        return;
      }

      if (statusData) {
        // Ensure statusData has the correct type before mapping
        const userIds = (statusData as UserStatusRow[]).map(status => status.user_id);
        
        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase // Explicitly type the returned data
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }
        
        // Create a map of profiles by user ID for easy lookup
        const profilesMap = (profilesData as ProfileRow[] || []).reduce((map: Record<string, ProfileRow>, profile: ProfileRow) => {
          map[profile.id] = profile;
          return map;
        }, {} as Record<string, ProfileRow>);
        
        // Combine status data with profile data
        const combinedData = (statusData as UserStatusRow[]).map((status: UserStatusRow) => ({
          user_id: status.user_id,
          status: status.status as UserStatusType,
          last_updated: status.last_updated,
          profiles: profilesMap[status.user_id] ? {
            username: profilesMap[status.user_id].username,
            avatar_url: profilesMap[status.user_id].avatar_url,
          } : null
        })) as UserStatusData[];
        
        setUserStatuses(combinedData);
        
        // Calculate stats
        const online = (statusData as UserStatusRow[]).filter((user: UserStatusRow) => user.status === 'online').length;
        const offline = (statusData as UserStatusRow[]).filter((user: UserStatusRow) => user.status === 'offline').length;
        const doNotDisturb = (statusData as UserStatusRow[]).filter((user: UserStatusRow) => user.status === 'do_not_disturb').length;
        
        setStats({
          online,
          offline,
          doNotDisturb,
          total: statusData.length
        });
      }
    } catch (error) {
      console.error('Error in fetchUserStatuses:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Set up real-time subscription
  useEffect(() => {
    if (!supabase || channelRef.current) { // Also check if channel already exists
      console.warn('Real-time subscription: Supabase client not available yet or channel already exists.');
      return;
    }

    console.log("Setting up Supabase channel 'user_status_monitor'");
    fetchUserStatuses(); // Initial fetch

    // Subscribe to changes in the user_status table
    const channel = supabase
      .channel('user_status_monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status',
        },
        (payload: RealtimePostgresChangesPayload<UserStatusRow>) => { // Use specific payload type
          console.log('Status change detected:', payload);

          // Refresh the data when any change occurs
          fetchUserStatuses();
        }
      )
      .subscribe((status, err) => { // Add subscribe callback for debugging
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to user_status_monitor!');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Subscription channel error:', err);
          // Optionally attempt to remove the channel if an error occurs during subscription
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }
        }
        if (status === 'TIMED_OUT') {
          console.warn('Subscription timed out.');
        }
      });

    channelRef.current = channel; // Store the channel instance
 
    return () => {
      console.log("Cleaning up Supabase channel 'user_status_monitor'");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current); // Use removeChannel for cleanup
        channelRef.current = null; // Clear the ref
      }
    };
  }, [supabase, fetchUserStatuses]);

  // Set up countdown timer that updates every second
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up a new interval that updates every second
    intervalRef.current = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Calculate time until offline
  const getTimeUntilOffline = (lastUpdated: string) => {
    const lastActivity = new Date(lastUpdated).getTime();
    const now = Date.now();
    const inactiveTime = now - lastActivity;
    const timeRemaining = inactivityThreshold - inactiveTime;
    
    if (timeRemaining <= 0) {
      return 'Offline now';
    }
    
    // Convert to minutes and seconds
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format the last updated time
  const formatLastUpdated = (lastUpdated: string) => {
    const date = new Date(lastUpdated);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loading type="fullscreen" text="Loading user statuses..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>User Status Monitor</h1>
      
      <div className={styles.statsContainer}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.online}</div>
          <div className={styles.statLabel}>Online</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.offline}</div>
          <div className={styles.statLabel}>Offline</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.doNotDisturb}</div>
          <div className={styles.statLabel}>Do Not Disturb</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statLabel}>Total Users</div>
        </div>
      </div>
      
      <div className={styles.tableContainer}>
        <table className={styles.statusTable}>
          <thead>
            <tr>
              <th>User</th>
              <th>Status</th>
              <th>Last Activity</th>
              <th>Time Until Offline</th>
            </tr>
          </thead>
          <tbody>
            {userStatuses.map((userStatus) => (
              <tr key={userStatus.user_id}>
                <td className={styles.userCell}>
                  <div className={styles.userInfo}>
                    <AvatarWithStatus
                      userId={userStatus.user_id}
                      avatarUrl={userStatus.profiles?.avatar_url || null}
                      username={userStatus.profiles?.username || 'Unknown User'}
                      size="medium"
                    />
                    <span className={styles.username}>
                      {userStatus.profiles?.username || 'Unknown User'}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[userStatus.status]}`}>
                    {userStatus.status}
                  </span>
                </td>
                <td>{formatLastUpdated(userStatus.last_updated)}</td>
                <td>
                  {userStatus.status !== 'offline' && (
                    <div className={styles.countdown}>
                      {getTimeUntilOffline(userStatus.last_updated)}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 