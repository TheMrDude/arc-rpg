/**
 * ENVIRONMENT VARIABLE VALIDATION
 *
 * Validates that all required environment variables are present at startup.
 * This prevents runtime errors from missing configuration.
 */

/**
 * Required environment variables for the application to function
 */
const REQUIRED_ENV_VARS = [
  // Supabase
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',

  // Anthropic AI
  'ANTHROPIC_API_KEY',

  // Stripe
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
];

/**
 * Optional but recommended environment variables
 */
const OPTIONAL_ENV_VARS = [
  'ADMIN_EMAILS',  // Comma-separated list of admin emails
];

/**
 * Validate environment variables at startup
 * @throws {Error} - Throws if required env vars are missing
 */
export function validateEnvVars() {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check optional variables
  for (const varName of OPTIONAL_ENV_VARS) {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  }

  // Throw error if required vars are missing
  if (missing.length > 0) {
    const errorMessage = `
❌ FATAL ERROR: Missing required environment variables!

The following environment variables are required but not set:
${missing.map(v => `  - ${v}`).join('\n')}

Please add these to your .env.local file.

Example .env.local:
${missing.map(v => `${v}=your_value_here`).join('\n')}
`;
    throw new Error(errorMessage);
  }

  // Log warnings for optional vars
  if (warnings.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  Optional environment variables not set:');
    warnings.forEach(v => console.warn(`  - ${v}`));
    console.warn('These are optional but may limit functionality.\n');
  }

  // Success message (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ All required environment variables are set');
  }
}

/**
 * Validate a specific env var exists
 * @param {string} varName - Name of the env var
 * @returns {string} - The env var value
 * @throws {Error} - Throws if env var is missing
 */
export function requireEnvVar(varName) {
  const value = process.env[varName];
  if (!value) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
  return value;
}

/**
 * Get an optional env var with a default value
 * @param {string} varName - Name of the env var
 * @param {string} defaultValue - Default value if not set
 * @returns {string} - The env var value or default
 */
export function getEnvVar(varName, defaultValue = '') {
  return process.env[varName] || defaultValue;
}
