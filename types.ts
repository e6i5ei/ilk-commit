
export interface WaterLog {
  id: string;
  amount: number; // in ml
  timestamp: number;
}

export interface UserSettings {
  weight: number; // in kg
  dailyGoal: number; // in ml
  reminderInterval: number; // in minutes
  name: string;
}

export interface AIAdvice {
  message: string;
  category: 'motivation' | 'health' | 'alert';
}
