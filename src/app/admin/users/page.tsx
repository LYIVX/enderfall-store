"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Button from '@/components/UI/Button';
import { FaEye, FaEdit } from 'react-icons/fa';
import styles from '../admin.module.css';
import Toggle from '@/components/UI/Toggle';
import Dropdown from '@/components/UI/Dropdown';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';

interface User {
  id: string;
  username: string;
  email: string | null;
  minecraft_username: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'admin', 'recent'
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  async function fetchUsers() {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          username,
          email,
          minecraft_username,
          avatar_url,
          is_admin,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter === 'admin') {
        query = query.eq('is_admin', true);
      } else if (filter === 'recent') {
        // Last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.gte('created_at', sevenDaysAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAdmin(userId: string, currentValue: boolean) {
    try {
      console.log('Attempting to update user:', userId, 'Setting is_admin to:', !currentValue);
      
      // Call the server API endpoint that uses supabaseAdmin
      const response = await fetch('/api/admin/users/toggle-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          isAdmin: !currentValue 
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('Error toggling admin status:', result.error);
        throw new Error(result.error || 'Failed to update admin status');
      }
      
      console.log('Admin status updated successfully:', result);

      // Update local state to reflect the change
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_admin: !currentValue } : user
      ));
    } catch (error) {
      console.error('Error toggling admin status:', error);
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading users...</div>;
  }

  return (
    <div>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentTitle}>Users Management</h2>
        <div className={styles.filterWrapper}>
          <Dropdown
            label="Filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Users' },
              { value: 'admin', label: 'Admins Only' },
              { value: 'recent', label: 'Recent (7 days)' }
            ]}
            layout="horizontal"
          />
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.colUsername}>Username</th>
            <th className={styles.colEmail}>Email</th>
            <th className={styles.colMinecraft}>Minecraft Username</th>
            <th className={styles.colJoined}>Joined</th>
            <th className={styles.colAdmin}>Admin</th>
            <th className={styles.colActions}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className={styles.colUsername}>
                <div className={styles.userWrapper}>
                  <AvatarWithStatus
                    userId={user.id}
                    avatarUrl={user.avatar_url}
                    username={user.username}
                    size="small"
                    className={styles.userAvatar}
                  />
                  <span>{user.username}</span>
                </div>
              </td>
              <td className={styles.colEmail}>{user.email || 'No email'}</td>
              <td className={styles.colMinecraft}>{user.minecraft_username || 'Not linked'}</td>
              <td className={styles.colJoined}>{new Date(user.created_at).toLocaleDateString()}</td>
              <td className={styles.colAdmin}>
                <div className={styles.toggleWrapper}>
                  <Toggle 
                    isEnabled={user.is_admin} 
                    onChange={() => toggleAdmin(user.id, user.is_admin)}
                  />
                </div>
              </td>
              <td className={styles.colActions}>
                <div className={styles.postActions}>
                  <Button 
                    variant="view"
                    size="small"
                    className={`${styles.actionButton} ${styles.viewButton}`}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                  >
                  </Button>
                  <Button 
                    variant="edit"
                    size="small"
                    className={`${styles.actionButton} ${styles.editButton}`}
                    onClick={() => router.push(`/admin/users/edit/${user.id}`)}
                  >
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center' }}>No users found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
} 