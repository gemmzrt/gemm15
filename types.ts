
export enum UserSegment {
  YOUNG = 'YOUNG',
  ADULT = 'ADULT',
  ADMIN = 'ADMIN'
}

export interface UserProfile {
  id: string; // uuid
  name: string;
  segment: UserSegment;
  is_celiac: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface EventConfig {
  id: number;
  event_date: string; // ISO string
  location_name: string;
  location_address: string;
  location_maps_url: string;
  time_young: string; // "14:00"
  time_adult: string; // "19:00"
  spotify_playlist_url: string;
  rules_young: string;
  rules_adult: string;
  dress_code_young: string;
  dress_code_adult: string;
  checklist_young: string;
  welcome_message: string;
}

export interface ThemeConfig {
  id: number;
  font_family: string;
  color_bg: string;
  color_card: string;
  color_text: string;
  color_primary: string;
  color_accent: string;
  motion_level: 'low' | 'medium' | 'high';
}

export interface RSVP {
  user_id: string;
  status: 'CONFIRMED' | 'DECLINED' | 'PENDING';
  note?: string;
  updated_at: string;
}

export interface SongSuggestion {
  id: number;
  user_id: string;
  url: string;
  comment: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  profiles?: UserProfile; // Joined
}

export interface Photo {
  id: number;
  user_id: string;
  storage_path: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  is_featured: boolean;
  created_at: string;
  url?: string; // Signed URL
  profiles?: UserProfile;
}

export interface ChatMessage {
  id: number;
  user_id: string; // or 'ADMIN' for system messages
  text: string;
  created_at: string;
  profiles?: UserProfile;
}

export interface InviteCode {
  code: string;
  segment: UserSegment;
  is_used: boolean;
}
