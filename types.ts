
export enum UserSegment {
  YOUNG = 'YOUNG',
  ADULT = 'ADULT',
  ADMIN = 'ADMIN'
}

export interface UserProfile {
  user_id: string; // Matches 'user_id' in public.users
  name: string;
  segment: UserSegment;
  is_celiac: boolean;
  avatar_url?: string;
  created_at: string;
  table?: string; // Mesa asignada
  rsvp_status?: 'CONFIRMED' | 'DECLINED' | 'PENDING'; // Integrated RSVP
  rsvp_updated_at?: string;
}

export interface EventConfig {
  id: number;
  event_date: string;
  location_name: string;
  location_address: string;
  location_maps_url: string;
  time_young: string;
  time_adult: string;
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

export interface SongSuggestion {
  id: number;
  user_id: string;
  url: string;
  comment: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  users?: UserProfile; // Joined table 'users'
}

export interface Photo {
  id: number;
  user_id: string;
  storage_path: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  is_featured: boolean;
  created_at: string;
  url?: string;
  users?: UserProfile; // Joined table 'users'
}

export interface ChatMessage {
  id: number;
  user_id: string;
  text: string;
  created_at: string;
  users?: UserProfile; // Joined table 'users'
}

export interface InviteCode {
  code: string;
  segment: UserSegment;
  is_used: boolean;
  used_by?: string;
}
