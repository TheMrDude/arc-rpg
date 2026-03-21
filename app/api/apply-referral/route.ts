import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyReferralCode } from '@/lib/referrals';
import { authenticateRequest } from '@/lib/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // Authenticate the request
    const { user, error: authError } = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { referralCode, userId } = await request.json();

    if (!referralCode || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the authenticated user matches the userId in the request
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: userId does not match authenticated user' },
        { status: 403 }
      );
    }

    // Apply referral code
    const result = await applyReferralCode(referralCode, userId, supabase);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error in apply-referral API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
