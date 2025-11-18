/**
 * Test Setup Utility
 * Creates and manages test users for security testing
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials for testing');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Create a test user with Supabase auth
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {object} metadata - User metadata
 * @returns {Promise<object>} - User data and access token
 */
async function createTestUser(email, password = 'TestPassword123!', metadata = {}) {
  try {
    // Create user
    const { data: { user }, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for testing
      user_metadata: metadata
    });

    if (signUpError) throw signUpError;

    // Generate session token for the user
    const { data: { session }, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: 'http://localhost:3000/dashboard'
      }
    });

    if (sessionError) {
      // Fallback: Sign in to get token
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;

      return {
        user: signInData.user,
        accessToken: signInData.session.access_token,
        userId: signInData.user.id
      };
    }

    // Create profile for the user
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        archetype: metadata.archetype || 'Warrior',
        level: metadata.level || 1,
        xp: metadata.xp || 0,
        gold: metadata.gold || 0,
        is_admin: metadata.is_admin || false
      });

    if (profileError) {
      console.warn('Profile creation warning:', profileError.message);
    }

    return {
      user,
      userId: user.id,
      accessToken: null, // Will be set via signInTestUser
      email
    };
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

/**
 * Sign in a test user to get a fresh access token
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} - Session data with access token
 */
async function signInTestUser(email, password = 'TestPassword123!') {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  return {
    accessToken: data.session.access_token,
    userId: data.user.id,
    user: data.user
  };
}

/**
 * Delete a test user
 * @param {string} userId - User ID to delete
 */
async function deleteTestUser(userId) {
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting test user:', error);
  }
}

/**
 * Clean up all test users (emails starting with test_)
 */
async function cleanupAllTestUsers() {
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    const testUsers = users.users.filter(u => u.email && u.email.startsWith('test_'));

    for (const user of testUsers) {
      await deleteTestUser(user.id);
    }

    console.log(`Cleaned up ${testUsers.length} test users`);
  } catch (error) {
    console.error('Error cleaning up test users:', error);
  }
}

/**
 * Setup standard test users for security testing
 * @returns {Promise<object>} - Test user credentials
 */
async function setupTestUsers() {
  const timestamp = Date.now();

  // Clean up old test users first
  await cleanupAllTestUsers();

  // Create regular user
  const regularUser = await createTestUser(
    `test_regular_${timestamp}@habitquest.test`,
    'TestPassword123!',
    { archetype: 'Warrior', level: 5 }
  );

  // Create another regular user for cross-user testing
  const otherUser = await createTestUser(
    `test_other_${timestamp}@habitquest.test`,
    'TestPassword123!',
    { archetype: 'Mage', level: 3 }
  );

  // Create premium user
  const premiumUser = await createTestUser(
    `test_premium_${timestamp}@habitquest.test`,
    'TestPassword123!',
    { archetype: 'Rogue', level: 10, is_premium: true }
  );

  // Create admin user (if ADMIN_EMAILS includes test emails)
  const adminUser = await createTestUser(
    `test_admin_${timestamp}@habitquest.test`,
    'TestPassword123!',
    { archetype: 'Cleric', level: 20, is_admin: true }
  );

  // Sign in users to get access tokens
  const regularSession = await signInTestUser(regularUser.email);
  const otherSession = await signInTestUser(otherUser.email);
  const premiumSession = await signInTestUser(premiumUser.email);
  const adminSession = await signInTestUser(adminUser.email);

  return {
    regular: {
      email: regularUser.email,
      userId: regularSession.userId,
      accessToken: regularSession.accessToken
    },
    other: {
      email: otherUser.email,
      userId: otherSession.userId,
      accessToken: otherSession.accessToken
    },
    premium: {
      email: premiumUser.email,
      userId: premiumSession.userId,
      accessToken: premiumSession.accessToken
    },
    admin: {
      email: adminUser.email,
      userId: adminSession.userId,
      accessToken: adminSession.accessToken
    },
    // Cleanup function
    cleanup: async () => {
      await deleteTestUser(regularSession.userId);
      await deleteTestUser(otherSession.userId);
      await deleteTestUser(premiumSession.userId);
      await deleteTestUser(adminSession.userId);
    }
  };
}

module.exports = {
  createTestUser,
  signInTestUser,
  deleteTestUser,
  cleanupAllTestUsers,
  setupTestUsers
};
