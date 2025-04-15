# Enderfall Social Features

This directory contains the components and pages that make up the social features of the Enderfall website.

## Overview

The social features include:

- **Feed**: Users can view posts from all users or just their friends
- **Profile**: Users can view their own or other users' profiles
- **Friendships**: Users can send, accept, and reject friend requests
- **Conversations**: Users can send private messages to other users

## Pages Structure

- `/social`: Main social page with feed and sidebar
- `/social/messages/[conversationId]`: Private message conversation between users
- `/profile/[userId]`: User profile page showing user details and posts

## Components

### Social Post Components

- `SocialPost.tsx`: Displays a post with content, author information, likes, and comments
- `CreatePost.tsx`: Form for creating new social posts

### Friend Components

- `FriendItem.tsx`: Displays a friend item in the sidebar or friends list
- `FriendRequest.tsx`: Displays a friend request with accept/reject actions

### Conversation Components

- `ConversationItem.tsx`: Displays a conversation item in the sidebar

## Database Schema

The social features use the following Supabase tables:

### Social Posts

```sql
social_posts
- id
- user_id
- content
- is_markdown
- created_at
- updated_at

social_post_comments
- id
- post_id
- user_id
- content
- created_at
- updated_at

social_post_likes
- id
- post_id
- user_id
- created_at
```

### Friendships

```sql
friendships
- id
- user_id
- friend_id
- status (pending, accepted, rejected)
- created_at
- updated_at
```

### Conversations

```sql
conversations
- id
- created_at
- updated_at

conversation_participants
- id
- conversation_id
- user_id
- created_at

messages
- id
- conversation_id
- sender_id (note: this is the user who sent the message)
- content
- is_read
- created_at
- updated_at
```

## Utility Functions

Utility functions for the social features can be found in:

- `src/lib/supabase.ts`: Database interactions
- `src/lib/socialUtils.ts`: Formatting and helper functions

## Realtime Features

The social features use Supabase's realtime functionality for:

- New messages in conversations
- New friend requests
- New posts from friends

## Styling

Each component has its own CSS module for styling:

- `SocialPost.module.css`
- `CreatePost.module.css`
- `FriendItem.module.css`
- `ConversationItem.module.css`

The page layouts also have their own CSS modules:

- `src/app/social/page.module.css`
- `src/app/social/messages/[conversationId]/page.module.css`
- `src/app/profile/[userId]/page.module.css`

## Fixing Conversation Functionality

If the messaging functionality is not working correctly, you need to apply the SQL fixes in the `fix_conversations.sql` file. This will:

1. Create or fix the necessary conversation tables if they don't match the expected schema
2. Set up SQL functions needed for messaging to work properly
3. Create indexes and triggers for better performance

### How to Apply the Fix:

1. Navigate to your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of `src/lib/supabase/sql/fix_conversations.sql`
4. Paste and run the SQL in the Supabase SQL Editor

### Troubleshooting Common Errors:

- **Column not found errors**: If you see errors like "column X does not exist", it means your database schema differs from what our code expects. The fix script should handle most of these issues, but you may need to modify column names in the script to match your actual database schema.

- **Table not found errors**: Make sure all required tables exist. The script will create them if they don't.

- **Permissions errors**: Ensure you're running the script with an account that has sufficient permissions to create tables, functions, and triggers.

- **Infinite recursion errors**: If you see an error message like "infinite recursion detected in policy for relation 'conversation_participants'", this is caused by circular references in Row Level Security (RLS) policies. The fix script includes statements to drop and recreate these policies with simplified versions that avoid recursion.

After applying the SQL fixes, the messaging features should work correctly. If you still encounter issues, check the browser console for specific error messages that might provide additional clues. 