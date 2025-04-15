import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';

// Define the activity types
export type ActivityType = 'forum_created' | 'blog_created' | 'user_created' | 'transaction' | 'social_post' | 'friendship' | 'message' | 'forum_comments' | 'social_post_comments';

// Activity item interface
export interface Activity {
  id: string;
  type: ActivityType;
  created_at: string;
  title: string;
  user_name?: string;
  user_id?: string;
  amount?: number;
  currency?: string;
  details?: any;
}

export async function GET(req: NextRequest) {
  try {
    // Verify that the request is authorized
    const origin = req.headers.get('origin');
    if (origin !== process.env.NEXT_PUBLIC_SITE_URL && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;
    
    // Array to collect all activities
    const activities: Activity[] = [];
    
    // 1. Fetch recent forum posts
    try {
      const { data: forumData, error: forumError } = await supabase
        .from('forum_posts')
        .select(`
          id, 
          title, 
          created_at, 
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Fetch more than we need to combine with other activities
      
      if (forumError) {
        console.error('Error fetching forum posts:', forumError);
      } else if (forumData && forumData.length > 0) {
        // Fetch usernames separately
        const userIds = forumData.map(post => post.user_id).filter(Boolean);
        let usernames: Record<string, string> = {};
        
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);
            
          if (profilesError) {
            console.error('Error fetching forum post authors:', profilesError);
          } else if (profilesData) {
            // Create a map of user_id to username
            usernames = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile.username;
              return acc;
            }, {} as Record<string, string>);
          }
        }
        
        const forumActivities: Activity[] = forumData.map(post => ({
          id: `forum-${post.id}`,
          type: 'forum_created',
          created_at: post.created_at,
          title: post.title,
          user_name: usernames[post.user_id] || 'Unknown',
          user_id: post.user_id,
          details: { post_id: post.id }
        }));
        
        activities.push(...forumActivities);
      }
    } catch (error) {
      console.error('Error processing forum activities:', error);
    }
    
    // 2. Fetch recent blog posts
    try {
      const { data: blogData, error: blogError } = await supabase
        .from('blog_posts')
        .select(`
          id, 
          title, 
          created_at, 
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (blogError) {
        console.error('Error fetching blog posts:', blogError);
      } else if (blogData && blogData.length > 0) {
        // Fetch usernames separately
        const userIds = blogData.map(post => post.user_id).filter(Boolean);
        let usernames: Record<string, string> = {};
        
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);
            
          if (profilesError) {
            console.error('Error fetching blog post authors:', profilesError);
          } else if (profilesData) {
            // Create a map of user_id to username
            usernames = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile.username;
              return acc;
            }, {} as Record<string, string>);
          }
        }
        
        const blogActivities: Activity[] = blogData.map(post => ({
          id: `blog-${post.id}`,
          type: 'blog_created',
          created_at: post.created_at,
          title: post.title,
          user_name: usernames[post.user_id] || 'Unknown',
          user_id: post.user_id,
          details: { post_id: post.id }
        }));
        
        activities.push(...blogActivities);
      }
    } catch (error) {
      console.error('Error processing blog activities:', error);
    }
    
    // 3. Fetch recent user sign-ups
    try {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, username, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (userError) {
        console.error('Error fetching users:', userError);
      } else if (userData) {
        const userActivities: Activity[] = userData.map(user => ({
          id: `user-${user.id}`,
          type: 'user_created',
          created_at: user.created_at,
          title: `User ${user.username} joined`,
          user_name: user.username,
          user_id: user.id,
          details: { }
        }));
        
        activities.push(...userActivities);
      }
    } catch (error) {
      console.error('Error processing user activities:', error);
    }
    
    // 4. Fetch recent transactions (from Stripe)
    try {
      // Get Stripe transactions for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const createdAfter = Math.floor(thirtyDaysAgo.getTime() / 1000);
      
      const paymentIntents = await stripe.paymentIntents.list({
        limit: 50,
        created: { gte: createdAfter }
      });
      
      if (paymentIntents.data && paymentIntents.data.length > 0) {
        const transactionActivities: Activity[] = paymentIntents.data
          .filter(payment => payment.status === 'succeeded')
          .map(payment => {
            const productName = payment.metadata?.product_name || 'Unknown Item';
            return {
              id: `tx-${payment.id}`,
              type: 'transaction',
              created_at: new Date(payment.created * 1000).toISOString(),
              title: `Purchase: ${productName}`,
              user_name: payment.metadata?.customer_email || 'Unknown',
              user_id: payment.metadata?.user_id,
              amount: payment.amount / 100,
              currency: payment.currency,
              details: { transaction_id: payment.id }
            };
          });
        
        activities.push(...transactionActivities);
      }
    } catch (error) {
      console.error('Error processing transaction activities:', error);
    }
    
    // 5. Fetch recent social posts
    try {
      const { data: socialPostData, error: socialPostError } = await supabase
        .from('social_posts')
        .select(`
          id, 
          content, 
          created_at, 
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (socialPostError) {
        console.error('Error fetching social posts:', socialPostError);
      } else if (socialPostData && socialPostData.length > 0) {
        // Fetch usernames separately
        const userIds = socialPostData.map(post => post.user_id).filter(Boolean);
        let usernames: Record<string, string> = {};
        
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);
            
          if (profilesError) {
            console.error('Error fetching social post authors:', profilesError);
          } else if (profilesData) {
            // Create a map of user_id to username
            usernames = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile.username;
              return acc;
            }, {} as Record<string, string>);
          }
        }
        
        const socialPostActivities: Activity[] = socialPostData.map(post => {
          // Create a title from the content, truncating if needed
          const title = post.content.length > 50 
            ? `${post.content.substring(0, 50)}...` 
            : post.content;
            
          return {
            id: `social-${post.id}`,
            type: 'social_post',
            created_at: post.created_at,
            title: `New social post: ${title}`,
            user_name: usernames[post.user_id] || 'Unknown',
            user_id: post.user_id,
            details: { post_id: post.id }
          };
        });
        
        activities.push(...socialPostActivities);
      }
    } catch (error) {
      console.error('Error processing social post activities:', error);
    }
    
    // 6. Fetch recent friendships
    try {
      const { data: friendshipData, error: friendshipError } = await supabase
        .from('friendships')
        .select(`
          id, 
          user_id, 
          friend_id, 
          created_at, 
          status
        `)
        .eq('status', 'accepted') // Only include accepted friendships
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (friendshipError) {
        console.error('Error fetching friendships:', friendshipError);
      } else if (friendshipData && friendshipData.length > 0) {
        // Fetch usernames separately for all users involved in friendships
        const userIds = friendshipData.flatMap(friendship => [
          friendship.user_id,
          friendship.friend_id
        ]).filter(Boolean);
        
        let usernames: Record<string, string> = {};
        
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);
            
          if (profilesError) {
            console.error('Error fetching friendship users:', profilesError);
          } else if (profilesData) {
            // Create a map of user_id to username
            usernames = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile.username;
              return acc;
            }, {} as Record<string, string>);
          }
        }
        
        const friendshipActivities: Activity[] = friendshipData.map(friendship => {
          const initiatorName = usernames[friendship.user_id] || 'Unknown';
          const friendName = usernames[friendship.friend_id] || 'Unknown';
          
          return {
            id: `friendship-${friendship.id}`,
            type: 'friendship',
            created_at: friendship.created_at,
            title: `${initiatorName} became friends with ${friendName}`,
            user_name: initiatorName,
            user_id: friendship.user_id,
            details: { 
              friendship_id: friendship.id,
              friend_id: friendship.friend_id,
              friend_name: friendName
            }
          };
        });
        
        activities.push(...friendshipActivities);
      }
    } catch (error) {
      console.error('Error processing friendship activities:', error);
    }
    
    // 7. Fetch recent messages
    try {
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select(`
          id, 
          conversation_id,
          sender_id, 
          content, 
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (messageError) {
        console.error('Error fetching messages:', messageError);
      } else if (messageData && messageData.length > 0) {
        // Get unique sender IDs and conversation IDs
        const senderIdsSet = new Set(messageData.map(message => message.sender_id));
        const senderIds = Array.from(senderIdsSet).filter(Boolean);
        
        const conversationIdsSet = new Set(messageData.map(message => message.conversation_id));
        const conversationIds = Array.from(conversationIdsSet).filter(Boolean);
        
        // Fetch usernames for senders
        let usernames: Record<string, string> = {};
        
        if (senderIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', senderIds);
            
          if (profilesError) {
            console.error('Error fetching message senders:', profilesError);
          } else if (profilesData) {
            // Create a map of user_id to username
            usernames = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile.username;
              return acc;
            }, {} as Record<string, string>);
          }
        }
        
        // Fetch conversation participants
        let conversationParticipants: Record<string, string[]> = {};
        
        if (conversationIds.length > 0) {
          const { data: participantsData, error: participantsError } = await supabase
            .from('conversation_participants')
            .select('conversation_id, user_id')
            .in('conversation_id', conversationIds);
            
          if (participantsError) {
            console.error('Error fetching conversation participants:', participantsError);
          } else if (participantsData) {
            // Group participants by conversation_id
            conversationParticipants = participantsData.reduce((acc, participant) => {
              if (!acc[participant.conversation_id]) {
                acc[participant.conversation_id] = [];
              }
              acc[participant.conversation_id].push(participant.user_id);
              return acc;
            }, {} as Record<string, string[]>);
            
            // For each conversation, fetch the other participant's username if not already fetched
            const missingUserIds = new Set<string>();
            
            for (const conversationId in conversationParticipants) {
              const participantIds = conversationParticipants[conversationId];
              for (const userId of participantIds) {
                if (!usernames[userId]) {
                  missingUserIds.add(userId);
                }
              }
            }
            
            if (missingUserIds.size > 0) {
              const { data: additionalProfilesData } = await supabase
                .from('profiles')
                .select('id, username')
                .in('id', Array.from(missingUserIds));
                
              if (additionalProfilesData) {
                for (const profile of additionalProfilesData) {
                  usernames[profile.id] = profile.username;
                }
              }
            }
          }
        }
        
        // Create message activities
        const messageActivities: Activity[] = messageData.map(message => {
          const senderName = usernames[message.sender_id] || 'Unknown';
          
          // Get the conversation participants
          const participants = conversationParticipants[message.conversation_id] || [];
          
          // Identify the recipient
          let recipientId = '';
          let recipientName = 'Unknown';
          
          if (participants.length > 0) {
            // Find the participant that is not the sender
            recipientId = participants.find(id => id !== message.sender_id) || '';
            recipientName = usernames[recipientId] || 'Unknown';
          }
          
          // Create a truncated version of the message content
          const messagePreview = message.content.length > 30
            ? `${message.content.substring(0, 30)}...`
            : message.content;
            
          return {
            id: `message-${message.id}`,
            type: 'message',
            created_at: message.created_at,
            title: `${senderName} sent a message to ${recipientName}: "${messagePreview}"`,
            user_name: senderName,
            user_id: message.sender_id,
            details: {
              message_id: message.id,
              conversation_id: message.conversation_id,
              recipient_id: recipientId,
              recipient_username: recipientName,
              sender_username: senderName
            }
          };
        });
        
        activities.push(...messageActivities);
      }
    } catch (error) {
      console.error('Error processing message activities:', error);
    }
    
    // 8. Fetch recent forum comments
    try {
      console.log('Fetching forum comments...');
      const { data: forumCommentData, error: forumCommentError } = await supabase
        .from('forum_comments')
        .select(`
          id, 
          content, 
          created_at, 
          user_id,
          post_id
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (forumCommentError) {
        console.error('Error fetching forum comments:', forumCommentError);
      } else if (forumCommentData && forumCommentData.length > 0) {
        console.log(`Found ${forumCommentData.length} forum comments`);
        
        // Fetch usernames separately
        const userIds = forumCommentData.map(comment => comment.user_id).filter(Boolean);
        console.log(`Found ${userIds.length} unique user IDs for forum comments`);
        
        let usernames: Record<string, string> = {};
        
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);
            
          if (profilesError) {
            console.error('Error fetching forum comment authors:', profilesError);
          } else if (profilesData) {
            // Create a map of user_id to username
            usernames = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile.username;
              return acc;
            }, {} as Record<string, string>);
          }
        }
        
        // Fetch forum post titles
        const postIdsSet = new Set(forumCommentData.map(comment => comment.post_id));
        const postIds = Array.from(postIdsSet).filter(Boolean);
        
        let postTitles: Record<string, string> = {};
        
        if (postIds.length > 0) {
          const { data: postsData, error: postsError } = await supabase
            .from('forum_posts')
            .select('id, title')
            .in('id', postIds);
            
          if (postsError) {
            console.error('Error fetching forum post titles:', postsError);
          } else if (postsData) {
            // Create a map of post_id to title
            postTitles = postsData.reduce((acc, post) => {
              acc[post.id] = post.title;
              return acc;
            }, {} as Record<string, string>);
          }
        }
        
        const forumCommentActivities: Activity[] = forumCommentData.map(comment => {
          // Create a title from the content, truncating if needed
          const commentPreview = comment.content.length > 50 
            ? `${comment.content.substring(0, 50)}...` 
            : comment.content;
          
          const postTitle = postTitles[comment.post_id] || 'Unknown Post';
            
          return {
            id: `forum-comment-${comment.id}`,
            type: 'forum_comments',
            created_at: comment.created_at,
            title: `Comment on "${postTitle}": ${commentPreview}`,
            user_name: usernames[comment.user_id] || 'Unknown',
            user_id: comment.user_id,
            details: { 
              comment_id: comment.id,
              post_id: comment.post_id,
              post_title: postTitle
            }
          };
        });
        
        activities.push(...forumCommentActivities);
      }
    } catch (error) {
      console.error('Error processing forum comment activities:', error);
    }
    
    // 9. Fetch recent social post comments
    try {
      console.log('Fetching social post comments...');
      const { data: socialCommentData, error: socialCommentError } = await supabase
        .from('social_post_comments')
        .select(`
          id, 
          content, 
          created_at, 
          user_id,
          post_id
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (socialCommentError) {
        console.error('Error fetching social post comments:', socialCommentError);
      } else if (socialCommentData && socialCommentData.length > 0) {
        console.log(`Found ${socialCommentData.length} social post comments`);
        
        // Fetch usernames separately
        const userIds = socialCommentData.map(comment => comment.user_id).filter(Boolean);
        let usernames: Record<string, string> = {};
        
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);
            
          if (profilesError) {
            console.error('Error fetching social comment authors:', profilesError);
          } else if (profilesData) {
            // Create a map of user_id to username
            usernames = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile.username;
              return acc;
            }, {} as Record<string, string>);
          }
        }
        
        // Fetch social post content for context
        const postIdsSet = new Set(socialCommentData.map(comment => comment.post_id));
        const postIds = Array.from(postIdsSet).filter(Boolean);
        
        let postContents: Record<string, string> = {};
        
        if (postIds.length > 0) {
          const { data: postsData, error: postsError } = await supabase
            .from('social_posts')
            .select('id, content')
            .in('id', postIds);
            
          if (postsError) {
            console.error('Error fetching social post contents:', postsError);
          } else if (postsData) {
            // Create a map of post_id to content
            postContents = postsData.reduce((acc, post) => {
              const postPreview = post.content.length > 30 
                ? `${post.content.substring(0, 30)}...` 
                : post.content;
              acc[post.id] = postPreview;
              return acc;
            }, {} as Record<string, string>);
          }
        }
        
        const socialCommentActivities: Activity[] = socialCommentData.map(comment => {
          // Create a title from the content, truncating if needed
          const commentPreview = comment.content.length > 50 
            ? `${comment.content.substring(0, 50)}...` 
            : comment.content;
          
          const postContent = postContents[comment.post_id] || 'Unknown Post';
            
          return {
            id: `social-comment-${comment.id}`,
            type: 'social_post_comments',
            created_at: comment.created_at,
            title: `Comment on post "${postContent}": ${commentPreview}`,
            user_name: usernames[comment.user_id] || 'Unknown',
            user_id: comment.user_id,
            details: { 
              comment_id: comment.id,
              post_id: comment.post_id,
              post_content: postContent
            }
          };
        });
        
        activities.push(...socialCommentActivities);
      }
    } catch (error) {
      console.error('Error processing social comment activities:', error);
    }
    
    // Sort all activities by date (newest first)
    activities.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    // Get total count for pagination
    const total = activities.length;
    
    // Log all activity types for debugging
    const activityTypes = activities.map(activity => activity.type);
    const typeCount = activityTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Activity types in response:', typeCount);
    
    // Paginate results
    const paginatedActivities = activities.slice(offset, offset + limit);
    
    return NextResponse.json({
      activities: paginatedActivities,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching admin activities:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admin activities' },
      { status: 500 }
    );
  }
} 