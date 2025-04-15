export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_status: {
        Row: {
          id: number
          user_id: string
          status: string
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          status: string
          last_updated: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          status?: string
          last_updated?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      },
      profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          minecraft_username: string | null
          discord_id: string | null
          google_id: string | null
          email: string | null
          has_completed_onboarding: boolean
          has_password: boolean
          is_admin: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          minecraft_username?: string | null
          discord_id?: string | null
          google_id?: string | null
          email?: string | null
          has_completed_onboarding?: boolean
          has_password?: boolean
          is_admin?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          minecraft_username?: string | null
          discord_id?: string | null
          google_id?: string | null
          email?: string | null
          has_completed_onboarding?: boolean
          has_password?: boolean
          is_admin?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 