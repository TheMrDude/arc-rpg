import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { clearRateLimit } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/clear-rate-limit
 *
 * Clear rate limit for a specific user and endpoint (support tool)
 * Admin only
 *
 * Body: { userId: string, endpoint: string }
 */
export async function POST(request) {
  // Check admin authorization
  const { error: adminError, user: adminUser } = await requireAdmin(request);
  if (adminError) return adminError;

  try {
    const { userId, endpoint } = await request.json();

    // Validate input
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid userId' },
        { status: 400 }
      );
    }

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json(
        { error: 'Invalid endpoint' },
        { status: 400 }
      );
    }

    // Clear the rate limit
    const result = await clearRateLimit(userId, endpoint);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to clear rate limit' },
        { status: 500 }
      );
    }

    console.log('Admin cleared rate limit:', {
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      targetUserId: userId,
      endpoint,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Rate limit cleared for user ${userId} on endpoint ${endpoint}`,
      userId,
      endpoint
    });
  } catch (error) {
    console.error('Admin clear rate limit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
