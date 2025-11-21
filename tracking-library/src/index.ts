/**
 * Analytics Pulse - Privacy-focused web analytics tracking library
 *
 * @packageDocumentation
 */

export { AnalyticsPulse } from './core';
export { EventQueue } from './queue';
export { Sender } from './sender';
export { SessionManager } from './session';
export type {
  AnalyticsPulseConfig,
  EventData,
  EventPayload,
  ApiResponse,
  QueuedEvent,
  PageViewMetadata,
} from './types';
export type { EventQueueConfig } from './queue';
export type { SenderConfig, SenderResponse } from './sender';
export type { SessionManagerConfig } from './session';

// Export utilities for advanced usage
export {
  generateUUID,
  getVisitorId,
  getSessionId,
  isDoNotTrackEnabled,
  getPageUrl,
  getReferrer,
  getScreenDimensions,
  getUserAgent,
  isOutboundLink,
} from './utils';
