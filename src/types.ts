export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface StudioProject {
  id: string;
  userId: string;
  title: string;
  type: 'image' | 'video' | 'audio' | 'chat';
  content: string; // URL or text
  prompt?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}
