
export enum JarvisStatus {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR'
}

export interface Message {
  role: 'user' | 'jarvis';
  text: string;
  timestamp: number;
  feedback?: 'up' | 'down';
}

export interface GroundingMetadata {
  web?: {
    uri: string;
    title: string;
  }[];
}
