export interface User {
  id: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}
