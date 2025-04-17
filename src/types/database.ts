export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      blog_posts: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_markdown: boolean | null
          is_pinned: boolean | null
          is_published: boolean | null
          summary: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_markdown?: boolean | null
          is_pinned?: boolean | null
          is_published?: boolean | null
          summary: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_markdown?: boolean | null
          is_pinned?: boolean | null
          is_published?: boolean | null
          summary?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      featured_ranks: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          rank_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order: number
          id?: string
          rank_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          rank_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "featured_ranks_rank_id_fkey"
            columns: ["rank_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts_with_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts_with_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          category: string
          content: string
          created_at: string | null
          id: string
          is_markdown: boolean | null
          is_pinned: boolean | null
          likes: number | null
          pinned: boolean | null
          summary: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          id?: string
          is_markdown?: boolean | null
          is_pinned?: boolean | null
          likes?: number | null
          pinned?: boolean | null
          summary?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          is_markdown?: boolean | null
          is_pinned?: boolean | null
          likes?: number | null
          pinned?: boolean | null
          summary?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_conversations_backup: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          discord_id: string | null
          email: string | null
          google_id: string | null
          has_completed_onboarding: boolean | null
          has_password: boolean | null
          id: string
          is_admin: boolean | null
          minecraft_username: string | null
          ranks: string[] | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          discord_id?: string | null
          email?: string | null
          google_id?: string | null
          has_completed_onboarding?: boolean | null
          has_password?: boolean | null
          id: string
          is_admin?: boolean | null
          minecraft_username?: string | null
          ranks?: string[] | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          discord_id?: string | null
          email?: string | null
          google_id?: string | null
          has_completed_onboarding?: boolean | null
          has_password?: boolean | null
          id?: string
          is_admin?: boolean | null
          minecraft_username?: string | null
          ranks?: string[] | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          category_id: string
          color: string | null
          created_at: string | null
          description: string
          display_order: number | null
          icon: string | null
          id: string
          image_url: string | null
          is_exclusive: boolean | null
          is_featured: boolean | null
          is_new: boolean | null
          is_popular: boolean | null
          is_upgrade: boolean | null
          name: string
          perks: Json | null
          price: number
          price_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          color?: string | null
          created_at?: string | null
          description: string
          display_order?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_exclusive?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          is_popular?: boolean | null
          is_upgrade?: boolean | null
          name: string
          perks?: Json | null
          price: number
          price_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          color?: string | null
          created_at?: string | null
          description?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_exclusive?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          is_popular?: boolean | null
          is_upgrade?: boolean | null
          name?: string
          perks?: Json | null
          price?: number
          price_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts_with_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts_with_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_markdown: boolean | null
          likes: number | null
          likes_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_markdown?: boolean | null
          likes?: number | null
          likes_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_markdown?: boolean | null
          likes?: number | null
          likes_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          email: string | null
          id: string
          items: Json | null
          metadata: Json | null
          payment_status: string | null
          rank_names: string[] | null
          transaction_id: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          items?: Json | null
          metadata?: Json | null
          payment_status?: string | null
          rank_names?: string[] | null
          transaction_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          items?: Json | null
          metadata?: Json | null
          payment_status?: string | null
          rank_names?: string[] | null
          transaction_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_status: {
        Row: {
          conversation_id: string
          id: string
          is_typing: boolean
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_typing?: boolean
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_typing?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_status_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_status: {
        Row: {
          created_at: string
          id: number
          is_manual: boolean | null
          last_updated: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_manual?: boolean | null
          last_updated?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          is_manual?: boolean | null
          last_updated?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      conversation_last_messages: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          id: string | null
          is_read: boolean | null
          sender_avatar: string | null
          sender_username: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations_with_last_message: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string | null
          last_message_content: string | null
          last_message_created_at: string | null
          last_message_id: string | null
          last_message_sender_id: string | null
          other_avatar_url: string | null
          other_user_id: string | null
          other_username: string | null
          participants: string[] | null
          unread_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["last_message_sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts_with_profiles: {
        Row: {
          avatar_url: string | null
          content: string | null
          created_at: string | null
          id: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      messages_with_profiles: {
        Row: {
          avatar_url: string | null
          content: string | null
          conversation_id: string | null
          created_at: string | null
          id: string | null
          is_read: boolean | null
          sender_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts_with_profiles: {
        Row: {
          avatar_url: string | null
          content: string | null
          created_at: string | null
          id: string | null
          likes_count: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_typing_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_typing_statuses: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_user_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      column_exists: {
        Args: { table_name: string; column_name: string }
        Returns: boolean
      }
      create_increment_function: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      create_or_get_conversation: {
        Args: { user_ids: string[] }
        Returns: string
      }
      create_parent_id_column: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      decrement_post_likes: {
        Args: { post_id: string }
        Returns: undefined
      }
      delete_identity_by_provider: {
        Args: { p_user_id: string; p_provider: string }
        Returns: boolean
      }
      execute_sql: {
        Args: { sql_query: string }
        Returns: undefined
      }
      execute_sql_with_params: {
        Args: { query: string; params: Json }
        Returns: undefined
      }
      get_conversation_messages: {
        Args: { conv_id: string; limit_count?: number; offset_count?: number }
        Returns: {
          id: string
          conversation_id: string
          user_id: string
          username: string
          avatar_url: string
          content: string
          is_read: boolean
          created_at: string
        }[]
      }
      get_conversations: {
        Args: { user_id_param: string }
        Returns: {
          id: string
          sender_id: string
          recipient_id: string
          content: string
          is_read: boolean
          created_at: string
          other_user_id: string
          username: string
          avatar_url: string
        }[]
      }
      get_conversations_with_unread_counts: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          name: string
          participants: Json
          last_message: Json
          unread_count: number
        }[]
      }
      get_messages_for_conversation: {
        Args: { p_conversation_id: string }
        Returns: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          created_at: string
          is_read: boolean
          username: string
          avatar_url: string
        }[]
      }
      get_post_stats: {
        Args: { post_ids: string[] }
        Returns: {
          post_id: string
          likes_count: number
          comments_count: number
        }[]
      }
      get_table_columns: {
        Args: { table_name: string }
        Returns: {
          column_name: string
          data_type: string
          is_nullable: boolean
        }[]
      }
      get_user_conversations: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          conversation_id: string
          participants: string[]
          last_message_id: string
          last_message_content: string
          last_message_created_at: string
          last_message_sender_id: string
          other_user_id: string
          other_username: string
          other_avatar_url: string
          unread_count: number
        }[]
      }
      get_user_conversations_with_last_message: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          created_at: string
          participants: string[]
          lastMessage: Json
          otherParticipant: Json
        }[]
      }
      increment: {
        Args: { x: number }
        Returns: number
      }
      increment_post_likes: {
        Args: { post_id: string }
        Returns: undefined
      }
      insert_transaction: {
        Args: { p_user_id: string; p_amount: number; p_transaction_id: string }
        Returns: undefined
      }
      mark_conversation_messages_as_read: {
        Args: { conv_id: string; reader_id: string }
        Returns: undefined
      }
      set_inactive_users_offline: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_typing_status: {
        Args:
          | { p_conversation_id: string; p_is_typing: boolean }
          | {
              p_conversation_id: string
              p_user_id: string
              p_is_typing: boolean
            }
        Returns: undefined
      }
      set_user_status: {
        Args:
          | {
              p_status: Database["public"]["Enums"]["user_status_type"]
              p_manual?: boolean
            }
          | { p_status: string }
          | { p_user_id: string; p_status: string }
        Returns: undefined
      }
      trigger_exists: {
        Args: { trigger_name: string; table_name: string }
        Returns: boolean
      }
      unlink_identity: {
        Args: { user_id: string; identity_provider: string }
        Returns: Json
      }
      user_heartbeat: {
        Args: Record<PropertyKey, never> | { user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      user_status_type: "online" | "offline" | "do_not_disturb"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_status_type: ["online", "offline", "do_not_disturb"],
    },
  },
} as const
