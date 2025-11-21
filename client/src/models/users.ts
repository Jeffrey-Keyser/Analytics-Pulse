export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  stripeCustomerId?: string;
  name?: string;
  avatar?: string;
  isEmailVerified?: boolean;
  settings?: UserSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSettings {
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
  notifications?: boolean;
  defaultAvailabilityWindows?: Record<string, string[][]>;
}
