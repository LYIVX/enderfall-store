"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useUserStatus } from '@/components/Auth/UserStatusContext';
import { useAuth } from '@/components/Auth/AuthContext';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';
import styles from './page.module.css';
import { Loading } from '@/components/UI';
import { Database } from '@/types/database';
import { UserStatusType } from '@/types/user-status';

interface UserStatusData {
  user_id: string;
  status: UserStatusType;
  last_updated: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null;
}

export default function UserStatusMonitor() {
  const supabase = createClientComponentClient<Database>();
  const { user } = useAuth();
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
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all user statuses
  const fetchUserStatuses = useCallback(async () => {
    try {
      // First, fetch user statuses
      const { data: statusData, error: statusError } = await supabase
        .from('user_status')
        .select(`
          user_id,
          status,
          last_updated
        `)
        .order('last_updated', { ascending: false });

      if (statusError) {
        console.error('Error fetching user statuses:', statusError);
        return;
      }

      if (statusData) {
        // Create a set of unique user IDs to fetch profiles for
        const userIds = statusData.map(status => status.user_id);
        
        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }
        
        // Create a map of profiles by user ID for easy lookup
        const profilesMap = (profilesData || []).reduce((map, profile) => {
          map[profile.id] = profile;
          return map;
        }, {} as Record<string, any>);
        
        // Combine status data with profile data
        const combinedData = statusData.map(status => ({
          user_id: status.user_id,
          status: status.status as UserStatusType,
          last_updated: status.last_updated,
          profiles: profilesMap[status.user_id] ? {
            username: profilesMap[status.user_id].username,
            avatar_url: profilesMap[status.user_id].avatar_url
          } : null
        })) as UserStatusData[];
        
        setUserStatuses(combinedData);
        
        // Calculate stats
        const online = statusData.filter(user => user.status === 'online').length;
        const offline = statusData.filter(user => user.status === 'offline').length;
        const doNotDisturb = statusData.filter(user => user.status === 'do_not_disturb').length;
        
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
    fetchUserStatuses();

    // Subscribe to changes in the user_status table
    const subscription = supabase
      .channel('user_status_monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status'
        },
        (payload: any) => {
          console.log('Status change detected:', payload);
          
          // Refresh the data when any change occurs
          fetchUserStatuses();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserStatuses]);
  
  // Set up countdown timer that updates every second
  useEffect(() => {
    // Clear any existing interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    // Set up a new interval that updates every second
    countdownIntervalRef.current = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
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