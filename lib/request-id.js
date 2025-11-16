/**
 * REQUEST ID GENERATION
 *
 * Generates unique request IDs for tracking requests through the system.
 * Useful for debugging and correlating logs across multiple services.
 */

import { randomBytes } from 'crypto';

/**
 * Generate a unique request ID
 * Format: req_<timestamp>_<random>
 * @returns {string} - Unique request ID
 */
export function generateRequestId() {
  const timestamp = Date.now().toString(36); // Base36 timestamp (shorter)
  const random = randomBytes(6).toString('hex'); // 12 char random string
  return `req_${timestamp}_${random}`;
}

/**
 * Extract request ID from request headers or generate new one
 * @param {Request} request - Next.js request object
 * @returns {string} - Request ID
 */
export function getRequestId(request) {
  // Check if request already has an ID (from load balancer, etc.)
  const existingId = request.headers.get('x-request-id');
  if (existingId) return existingId;

  // Generate new ID
  return generateRequestId();
}

/**
 * Add request ID to response headers
 * @param {Response} response - Response object
 * @param {string} requestId - Request ID
 * @returns {Response} - Modified response
 */
export function addRequestIdHeader(response, requestId) {
  response.headers.set('x-request-id', requestId);
  return response;
}

/**
 * Enhanced logging with request ID
 * @param {string} requestId - Request ID
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
export function logWithRequestId(requestId, level, message, data = {}) {
  const logData = {
    requestId,
    timestamp: new Date().toISOString(),
    ...data
  };

  const logMessage = `[${requestId}] ${message}`;

  switch (level) {
    case 'error':
      console.error(logMessage, logData);
      break;
    case 'warn':
      console.warn(logMessage, logData);
      break;
    default:
      console.log(logMessage, logData);
  }
}
