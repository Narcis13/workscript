/**
 * @fileoverview Repository Exports for OAuth Integrations
 *
 * This module exports all repository classes for the integrations system.
 *
 * @module integrations/repositories
 */

export {
  ConnectionRepository,
  getConnectionRepository,
  type ConnectionFilters,
  type ConnectionTokenUpdate,
} from './connectionRepository';
