"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthContext';
import { Loading } from '@/components/UI';
import styles from '../../../admin.module.css';
import Tabs from '@/components/UI/Tabs';
import Button from '@/components/UI/Button';
import Input from '@/components/UI/Input';
import Image from 'next/image';
import { FaEdit, FaTrash, FaEye, FaUser, FaComments, FaNewspaper, FaStream, FaUpload } from 'react-icons/fa';
import { useLoading } from '@/hooks';
import { useRouter } from 'next/navigation';
import AvatarWithStatus from '@/components/UI/AvatarWithStatus';

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  minecraft_username: string | null;
  is_admin: boolean;
  created_at: string;
  previous_avatars: string[];
}

interface ContentItem {
  id: string;
  title?: string;
  content: string;
  created_at: string;
  updated_at: string;
  likes?: number;
  _count?: {
    comments: number;
  };
}

export default function AdminUserEdit() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { isLoading, startLoading, stopLoading } = useLoading();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('forums');
  const [content, setContent] = useState<{
    forums: ContentItem[];
    blogs: ContentItem[];
    social: ContentItem[];
  }>({
    forums: [],
    blogs: [],
    social: []
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    minecraft_username: ''
  });
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previousAvatars, setPreviousAvatars] = useState<{path: string, url: string}[]>([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);

  useEffect(() => {
    if (id) {
      fetchUserProfile();
    }
  }, [id]);

  useEffect(() => {
    if (profile && id) {
      console.log("Profile data:", profile);
      console.log("Previous avatars:", profile.previous_avatars);
      fetchUserContent();
    }
  }, [profile, id]);

  // Fetch previous avatars on component mount
  useEffect(() => {
    if (profile?.id) {
      fetchPreviousAvatars();
    }
  }, [profile?.id]);

  async function fetchUserProfile() {
    try {
      setIsLoadingAvatars(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id);
      
      if (error) throw error;

      // Check if any user was found
      if (!data || data.length === 0) {
        console.error(`No user found with ID: ${id}`);
        setLoading(false);
        setIsLoadingAvatars(false);
        setProfile(null);
        return; // Exit early if no user is found
      }
      
      // Use the first user if multiple are returned (shouldn't happen with proper ID)
      const userData = data[0];
      
      console.log("Raw profile data from Supabase:", userData);
      
      setProfile(userData);
      setEditForm({
        username: userData.username || '',
        minecraft_username: userData.minecraft_username || ''
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
      setIsLoadingAvatars(false);
    }
  }

  async function deletePost(postId: string) {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    startLoading(`delete-${postId}`);
    try {
      const { error } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Remove post from state
      setContent(prev => ({
        ...prev,
        forums: prev.forums.filter(forum => forum.id !== postId),
        blogs: prev.blogs.filter(blog => blog.id !== postId),
        social: prev.social.filter(post => post.id !== postId)
      }));
      // Refetch to update counts
      fetchUserContent();
    } catch (error) {
      console.error('Error deleting forum post:', error);
    } finally {
      stopLoading(`delete-${postId}`);
    }
  }

  async function fetchUserContent() {
    try {
      console.log('Fetching content for user:', id); // Debug log

      // Fetch forums
      const { data: forumsData, error: forumsError } = await supabase
        .from('forum_posts')
        .select(`
          id,
          title,
          content,
          created_at,
          updated_at,
          likes,
          _count:forum_comments(count)
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (forumsError) {
        console.error('Forums error:', forumsError);
        throw forumsError;
      }

      console.log('Raw forums data:', forumsData); // Debug log

      // Fetch blogs if user is admin
      let blogsData: ContentItem[] = [];
      if (profile?.is_admin) {
        const { data: blogsRawData, error: blogsError } = await supabase
          .from('blog_posts')
          .select(`
            id,
            title,
            content,
            created_at,
            updated_at
          `)
          .eq('user_id', id)
          .order('created_at', { ascending: false });

        if (blogsError) {
          console.error('Blogs error:', blogsError);
          throw blogsError;
        }

        console.log('Raw blogs data:', blogsRawData); // Debug log

        blogsData = blogsRawData.map(blog => ({
          ...blog,
          _count: { comments: 0 } // Add default _count since it's not available in the query
        }));
      }

      // Fetch social posts
      const { data: socialRawData, error: socialError } = await supabase
        .from('social_posts')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          likes,
          _count:social_post_comments(count)
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (socialError) {
        console.error('Social posts error:', socialError);
        throw socialError;
      }

      console.log('Raw social data:', socialRawData); // Debug log

      const processedContent = {
        forums: forumsData.map(forum => ({
          ...forum,
          _count: { comments: forum._count?.[0]?.count || 0 }
        })) || [],
        blogs: blogsData,
        social: socialRawData.map(post => ({
          ...post,
          _count: { comments: post._count?.[0]?.count || 0 }
        })) || []
      };

      console.log('Processed content:', processedContent); // Debug log

      setContent(processedContent);
    } catch (error) {
      console.error('Error fetching user content:', error);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editForm.username,
          minecraft_username: editForm.minecraft_username
        })
        .eq('id', id);

      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        username: editForm.username,
        minecraft_username: editForm.minecraft_username
      } : null);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  }

  // Function to fetch previous avatars from Supabase storage
  const fetchPreviousAvatars = async () => {
    if (!id) return;

    setIsLoadingAvatars(true);
    try {
      // List all files in the user's avatar folder
      const { data, error } = await supabase
        .storage
        .from('avatars')
        .list(`${id}`, {
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error fetching previous avatars:', error);
        return;
      }

      // Get URLs for each avatar
      if (data && data.length > 0) {
        const avatarsWithUrls = data.map(file => {
          const path = `${id}/${file.name}`;
          const { data: urlData } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(path);

          return {
            path,
            url: urlData.publicUrl
          };
        });

        setPreviousAvatars(avatarsWithUrls);
      }
    } catch (err) {
      console.error('Error in fetchPreviousAvatars:', err);
    } finally {
      setIsLoadingAvatars(false);
    }
  };

  // Switch to a previous avatar
  const switchToAvatar = async (avatarUrl: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', id);

      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        avatar_url: avatarUrl
      } : null);
    } catch (error) {
      console.error('Error updating avatar:', error);
    }
  };

  // Delete an avatar
  const deleteAvatar = async (avatarPath: string) => {
    if (!confirm("Are you sure you want to delete this avatar?")) return;

    try {
      const { error } = await supabase
        .storage
        .from('avatars')
        .remove([avatarPath]);

      if (error) throw error;

      // Refresh the list
      fetchPreviousAvatars();
    } catch (error) {
      console.error('Error deleting avatar:', error);
    }
  };

  // Handle avatar file change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  async function handleAvatarUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!avatarFile) return;

    setUploadingAvatar(true);
    try {
      // Upload file to storage
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: publicURL } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicURL.publicUrl
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        avatar_url: publicURL.publicUrl
      } : null);

      // Refresh the avatars list
      fetchPreviousAvatars();

      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loading type="fullscreen" text="Loading user data..." />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.contentWrapper}>
        <div className={styles.contentHeader}>
          <h2 className={styles.contentTitle}>User Not Found</h2>
        </div>
        
        <div className={styles.errorContainer}>
          <div className={styles.errorMessage}>
            <p>We couldn't find a user with the ID: <code>{id}</code></p>
            <p>The user might have been deleted or the ID is incorrect.</p>
          </div>
          <div className={styles.errorActions}>
            <Button 
              variant="primary"
              onClick={() => router.push('/admin/users')}
            >
              Return to Users List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <FaUser /> },
    { id: 'forums', label: 'Forums', icon: <FaComments /> },
    { id: 'blogs', label: 'Blogs', icon: <FaNewspaper /> },
    { id: 'social', label: 'Social Posts', icon: <FaStream /> }
  ];

  return (
    <div className={styles.contentWrapper}>
      <div className={styles.contentHeader}>
        <h2 className={styles.contentTitle}>Edit User Profile</h2>
      </div>

      {/* Profile Section */}
      <div className={styles.profileSection}>
        <div className={styles.profileHeader}>
          <div className={styles.avatarSection}>
            <div className={styles.currentAvatar}>
              {profile.avatar_url ? (
                <AvatarWithStatus
                  userId={profile.id}
                  avatarUrl={profile.avatar_url}
                  username={profile.username}
                  size="xxxxxlarge"
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className={styles.profileInfo}>
            <h3>{profile.username}</h3>
            <p>Minecraft: {profile.minecraft_username || 'Not linked'}</p>
            <p>Member since: {new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        showContentBackground={true}
        className={styles.adminTabs}
        renderTabContent={(tab) => {
          if (tab.id === 'profile') {
            return (
              <div className={styles.profileEditSection}>
                {/* Profile edit content */}
                <h3>Edit Profile</h3>
                <form onSubmit={handleUpdateProfile} className={styles.editForm}>
                  <Input
                    label="Username"
                    value={editForm.username}
                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                  />
                  <Input
                    label="Minecraft Username"
                    value={editForm.minecraft_username}
                    onChange={(e) => setEditForm(prev => ({ ...prev, minecraft_username: e.target.value }))}
                  />
                  <div className={styles.formActions}>
                    <Button type="submit" variant="primary">Save Changes</Button>
                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </div>
                </form>
                
                <div className={styles.previousAvatarsSection}>
                  <h3>Avatar Management</h3>
                  
                  {/* Upload new avatar */}
                  <div className={styles.avatarUploadSection}>
                    <h4>Upload New Avatar</h4>
                    <form onSubmit={handleAvatarUpload} className={styles.uploadForm}>
                      <div className={styles.fileInputWrapper}>
                        <input
                          type="file"
                          id="avatar"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          ref={fileInputRef}
                          className={styles.fileInput}
                        />
                        <Button 
                          type="button" 
                          variant="ghost"
                          onClick={() => fileInputRef.current?.click()}
                          className={styles.fileSelectButton}
                        >
                          <FaUpload /> {profile?.avatar_url ? 'Change' : 'Upload'}
                        </Button>
                        <span className={styles.fileName}>
                          {avatarFile ? avatarFile.name : 'No file selected'}
                        </span>
                      </div>
                      {avatarFile ? (
                        <div className={styles.confirmButtons}>
                          <Button
                            type="submit"
                            variant="primary"
                            disabled={uploadingAvatar}
                          >
                            {uploadingAvatar ? 'Uploading...' : 'Confirm'}
                          </Button>
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() => {
                              setAvatarFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            disabled={uploadingAvatar}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          type="submit" 
                          variant="primary" 
                          disabled={!avatarFile || uploadingAvatar}
                        >
                          {uploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
                        </Button>
                      )}
                    </form>
                  </div>

                  {/* Previous Avatars Section */}
                  <h3>Previous Profile Pictures</h3>
                  {isLoadingAvatars ? (
                    <div className={styles.noContent}>Loading previous avatars...</div>
                  ) : previousAvatars.length > 0 ? (
                    <div className={styles.previousAvatars}>
                      {previousAvatars.map((avatar, index) => (
                        <div key={index} className={styles.previousAvatarItem}>
                          <div className={styles.previousAvatarImage}>
                            <AvatarWithStatus
                              userId={profile.id}
                              avatarUrl={avatar.url}
                              username={profile.username}
                              size="xlarge"
                            />
                          </div>
                          <div className={styles.previousAvatarActions}>
                            <Button
                              variant="primary"
                              size="small"
                              onClick={() => switchToAvatar(avatar.url)}
                              disabled={uploadingAvatar}
                            >
                              Use
                            </Button>
                            <Button
                              variant="delete"
                              size="small"
                              onClick={() => deleteAvatar(avatar.path)}
                              disabled={uploadingAvatar}
                            >
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.noContent}>No previous avatars found</p>
                  )}
                </div>
              </div>
            );
          }
          
          if (tab.id === 'forums') {
            return (
              <>
                {content.forums.length === 0 ? (
                  <p className={styles.noContent}>No forum posts found</p>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Created</th>
                        <th>Likes</th>
                        <th>Comments</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {content.forums.map(forum => (
                        <tr key={forum.id}>
                          <td>{forum.title}</td>
                          <td>{new Date(forum.created_at).toLocaleDateString()}</td>
                          <td>{forum.likes || 0}</td>
                          <td>{forum._count?.comments || 0}</td>
                          <td>
                          <div className={styles.postActions}>
                              <Button 
                                variant="view"
                                size="small"
                                className={`${styles.actionButton} ${styles.viewButton}`}
                                onClick={() => router.push(`/social?tab=forums&forum=${forum.id}`)}
                                disabled={isLoading(`view-${forum.id}`)}
                              >
                              </Button>
                              <Button 
                                variant="edit"
                                size="small"
                                className={`${styles.actionButton} ${styles.editButton}`}
                                onClick={() => router.push(`/admin/forums/edit/${forum.id}`)}
                                disabled={isLoading(`edit-${forum.id}`)}
                              >
                              </Button>
                              <Button 
                                variant="delete"
                                size="small"
                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                onClick={() => deletePost(forum.id)} 
                                disabled={isLoading(`delete-${forum.id}`)}
                              >
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            );
          }
          
          if (tab.id === 'blogs' && profile.is_admin) {
            return (
              <>
                {content.blogs.length === 0 ? (
                  <p className={styles.noContent}>No blog posts found</p>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Created</th>
                        <th>Comments</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {content.blogs.map(blog => (
                        <tr key={blog.id}>
                          <td>{blog.title}</td>
                          <td>{new Date(blog.created_at).toLocaleDateString()}</td>
                          <td>{blog._count?.comments || 0}</td>
                          <td>
                          <div className={styles.postActions}>
                              <Button 
                                variant="view"
                                size="small"
                                className={`${styles.actionButton} ${styles.viewButton}`}
                                onClick={() => router.push(`/social?tab=blogs&blog=${blog.id}`)}
                                disabled={isLoading(`view-${blog.id}`)}
                              >
                              </Button>
                              <Button 
                                variant="edit"
                                size="small"
                                className={`${styles.actionButton} ${styles.editButton}`}
                                onClick={() => router.push(`/admin/blogs/edit/${blog.id}`)}
                                disabled={isLoading(`edit-${blog.id}`)}
                              >
                              </Button>
                              <Button 
                                variant="delete"
                                size="small"
                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                onClick={() => deletePost(blog.id)} 
                                disabled={isLoading(`delete-${blog.id}`)}
                              >
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            );
          }
          
          if (tab.id === 'social') {
            return (
              <>
                {content.social.length === 0 ? (
                  <p className={styles.noContent}>No social posts found</p>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Content</th>
                        <th>Created</th>
                        <th>Likes</th>
                        <th>Comments</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {content.social.map(post => (
                        <tr key={post.id}>
                          <td>{post.content.substring(0, 50)}...</td>
                          <td>{new Date(post.created_at).toLocaleDateString()}</td>
                          <td>{post.likes || 0}</td>
                          <td>{post._count?.comments || 0}</td>
                          <td>
                            <div className={styles.postActions}>
                              <Button 
                                variant="view"
                                size="small"
                                className={`${styles.actionButton} ${styles.viewButton}`}
                                onClick={() => router.push(`/social?tab=social&view=${post.id}&scroll=true`)}
                                disabled={isLoading(`view-${post.id}`)}
                              >
                              </Button>
                              <Button 
                                variant="edit"
                                size="small"
                                className={`${styles.actionButton} ${styles.editButton}`}
                                onClick={() => router.push(`/admin/social/edit/${post.id}`)}
                                disabled={isLoading(`edit-${post.id}`)}
                              >
                              </Button>
                              <Button 
                                variant="delete"
                                size="small"
                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                onClick={() => deletePost(post.id)} 
                                disabled={isLoading(`delete-${post.id}`)}
                              >
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            );
          }
          
          return null;
        }}
      />
    </div>
  );
} 