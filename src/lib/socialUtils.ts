// Format a timestamp for display in social contexts
export const formatSocialTime = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) { // Less than a week
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined
    });
  }
};

// Format a conversation time (prioritizing last message time)
export const formatConversationTime = (
  messageTimestamp?: string | null, 
  conversationTimestamp?: string
): string => {
  if (messageTimestamp) {
    return formatSocialTime(messageTimestamp);
  } else if (conversationTimestamp) {
    return formatSocialTime(conversationTimestamp);
  }
  return '';
};

// Truncate long text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Get a friendly display for user's membership duration
export const getMembershipDuration = (createdAt: string): string => {
  const joinDate = new Date(createdAt);
  const now = new Date();
  
  const diffInDays = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays < 30) {
    return `${diffInDays} days`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(diffInDays / 365);
    const remainingMonths = Math.floor((diffInDays % 365) / 30);
    
    if (remainingMonths === 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    }
    return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  }
};

// Generate a placeholder for user avatars based on username
export const getInitialsPlaceholder = (username: string): string => {
  if (!username) return 'U';
  return username.charAt(0).toUpperCase();
};

// Format number of likes/comments for display
export const formatCount = (count: number): string => {
  if (count === 0) return '0';
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
};

// Check if two dates are on the same day
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Format message time for conversation view
export const formatMessageTime = (timestamp: string): string => {
  const messageDate = new Date(timestamp);
  const now = new Date();
  
  // For messages today, show time only
  if (isSameDay(messageDate, now)) {
    return messageDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  
  // For messages within the last week, show day of week
  const diffInDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffInDays < 7) {
    return messageDate.toLocaleDateString(undefined, { weekday: 'short' }) + ' ' + 
           messageDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  
  // For older messages, show date
  return messageDate.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric',
    year: now.getFullYear() !== messageDate.getFullYear() ? 'numeric' : undefined
  });
};

// Generate a unique color for a user based on their ID
export const getUserColor = (userId: string): string => {
  // Generate a deterministic color from a user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to a soft, pleasing color (adjust the RGB value to avoid too dark/bright colors)
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 65%)`;
};

// Get number of unread messages across all conversations
export const getTotalUnreadMessages = (conversations: any[]): number => {
  return conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0);
}; 