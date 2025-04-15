"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Input from '@/components/UI/Input';
import Button from '@/components/UI/Button';
import { FaSearch } from 'react-icons/fa';
import FriendItem from './FriendItem';
import styles from './UserSearch.module.css';
import { NineSliceContainer } from '../UI';

interface UserSearchProps {
  currentUserId: string;
  onSendRequest: (userId: string) => Promise<void>;
}

const UserSearch = ({ currentUserId, onSendRequest }: UserSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Reset results when query changes
  useEffect(() => {
    if (searchQuery === '') {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setShowResults(true);
    
    try {
      // Search for users by username (case insensitive)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', currentUserId) // Exclude the current user
        .limit(10);
        
      if (error) throw error;
      
      // Check existing friendships to exclude users who already have a relationship
      const { data: existingFriendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);
        
      if (friendshipsError) throw friendshipsError;
      
      // Filter out users who already have a friendship relationship with the current user
      const filteredResults = data?.filter(user => {
        if (!existingFriendships) return true;
        
        return !existingFriendships.some(
          f => (f.user_id === currentUserId && f.friend_id === user.id) || 
               (f.friend_id === currentUserId && f.user_id === user.id)
        );
      });
      
      setSearchResults(filteredResults || []);
    } catch (error) {
      console.error('Error searching for users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    await onSendRequest(userId);
    
    // Remove this user from search results after sending request
    setSearchResults(prev => prev.filter(user => user.id !== userId));
  };

  return (
    <NineSliceContainer className={styles.userSearch}>
      <div className={styles.userSearchBody}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <Input
            label=""
          placeholder="Search by username"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={!searchQuery.trim() || isSearching}
          className={styles.searchButton}
        >
          <FaSearch />
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </form>
      </div>
      
      {showResults && (
        <NineSliceContainer className={styles.searchResults}>
          {isSearching ? (
            <div className={styles.searching}>Searching...</div>
          ) : searchResults.length === 0 ? (
            <div className={styles.noResults}>
              {searchQuery ? 'No users found matching your search' : 'Enter a username to search'}
            </div>
          ) : (
            <>
              <div className={styles.resultsCount}>
                Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
              </div>
              <div className={styles.resultsList}>
                {searchResults.map(user => (
                  <FriendItem
                    key={user.id}
                    user={user}
                    currentUserId={currentUserId}
                    type="user"
                    onSendRequest={handleSendFriendRequest}
                  />
                ))}
              </div>
            </>
          )}
        </NineSliceContainer>
      )}
    </NineSliceContainer>
  );
};

export default UserSearch; 