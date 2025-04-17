// Old type - consider removing if fully replaced
// export type UserStatusType = 'online' | 'do_not_disturb' | 'offline';

// New status value type including 'away'
export type UserStatusValue = 'online' | 'offline' | 'away' | 'do_not_disturb';

// Old interface - consider removing if fully replaced
// export interface UserStatus {
//   user_id: string;
//   status: UserStatusType; // Uses old type
//   last_updated: string;
// }

// Old table interface - may be superseded by generated Database types
// export interface UserStatusTable {
//   id: number;
//   user_id: string;
//   status: UserStatusType; // Uses old type
//   last_updated: string;
//   created_at: string;
// }

// New record interface used in context and expected from DB fetch
export interface UserStatusRecord {
  user_id: string;
  status: UserStatusValue; // Uses new type
  is_manual: boolean;     // Added flag
  last_updated: string;   // ISO 8601 timestamp string
}

// Payload for Supabase Realtime - may need update if structure changed
// Keep this for now, but verify if the realtime payload structure matches
export interface UserStatusPayload {
  new: Partial<UserStatusRecord>; // Use Partial<UserStatusRecord> or a specific type
  old?: Partial<UserStatusRecord>;
  [key: string]: any;
}