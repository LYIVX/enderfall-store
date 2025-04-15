export type UserStatusType = 'online' | 'do_not_disturb' | 'offline';

export interface UserStatus {
  user_id: string;
  status: UserStatusType;
  last_updated: string;
}

export interface UserStatusTable {
  id: number;
  user_id: string;
  status: UserStatusType;
  last_updated: string;
  created_at: string;
}

export interface UserStatusPayload {
  new: UserStatus;
  old?: UserStatus;
  [key: string]: any;
} 