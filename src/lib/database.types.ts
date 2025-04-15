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
      }
      // ... existing tables ...
    }
    // ... existing views, functions, etc. ...
  }
}