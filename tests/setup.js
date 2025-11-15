/**
 * JEST SETUP FILE
 *
 * Runs before all tests
 * Sets up environment, mocks, and global test utilities
 */

// Load environment variables from .env.test
require('dotenv').config({ path: '.env.test' });

// Set test environment flag
process.env.NODE_ENV = 'test';

// Global test timeout (can be overridden per test)
jest.setTimeout(30000);

// Mock console methods to reduce noise (optional)
// Uncomment if you want cleaner test output
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Add custom matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be a valid UUID`
        : `expected ${received} to be a valid UUID`
    };
  },

  toBeValidISODate(received) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime()) && received === date.toISOString();

    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be a valid ISO date`
        : `expected ${received} to be a valid ISO date`
    };
  },
});

// Global test utilities
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.waitForCondition = async (conditionFn, timeout = 5000, interval = 100) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) {
      return true;
    }
    await global.sleep(interval);
  }

  throw new Error(`Condition not met within ${timeout}ms`);
};

// Log test environment info
console.log('Test Environment Setup:');
console.log('- Node Environment:', process.env.NODE_ENV);
console.log('- API Base:', process.env.TEST_API_BASE || 'http://localhost:3000');
console.log('- Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Not Set');
console.log('- Test User Token:', process.env.TEST_USER_TOKEN ? '✓ Set' : '✗ Not Set');
console.log('- Admin Token:', process.env.TEST_ADMIN_TOKEN ? '✓ Set' : '✗ Not Set');
console.log('');

// Warn about missing environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'TEST_USER_TOKEN',
  'TEST_USER_ID',
];

const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.warn('⚠️  Missing environment variables:');
  missing.forEach(v => console.warn(`   - ${v}`));
  console.warn('   Some tests will be skipped.\n');
}
