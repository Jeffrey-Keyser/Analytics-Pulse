import { Session, SessionData } from 'express-session';
import { User } from './models';
import { Express } from 'express';
import { Request } from 'express';

import { PayUser } from '@jeffrey-keyser/pay-auth-integration';

declare module 'express-serve-static-core' {
  interface Request {
    session: Session & Partial<SessionData> & {
      userId?: string;
      user?: any;
      isAuthenticated?: boolean;
    };
    // Custom userId property for backward compatibility
    userId?: string;
    // Updated user interface for pay-auth-integration compatibility
    user?: PayUser | null;
    payAccessToken?: string | null;
    // Legacy compatibility
    userData?: {
      id: string | number;
      email?: string;
      name?: string;
      role?: string;
      [key: string]: string | number | boolean | undefined;
    };
  }
}

// Adding this empty export makes TypeScript treat this file as a module,
// which is often necessary for global augmentations to be correctly applied.
export {}; 