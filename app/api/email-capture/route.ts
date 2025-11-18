import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // Rate limiting (5 attempts per 10 minutes per IP)
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`email_capture:${clientIP}`, 5, 10 * 60 * 1000);

    if (!rateLimit.allowed) {
      const resetIn = Math.ceil((rateLimit.resetAt - Date.now()) / 1000 / 60);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many attempts. Please try again in ${resetIn} minutes.`
        },
        { status: 429 }
      );
    }

    // Parse request body
    const { email, source, tags = [] } = await request.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email', message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate source
    if (!source || typeof source !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Source is required' },
        { status: 400 }
      );
    }

    // Get metadata
    const metadata = {
      ip: clientIP,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      timestamp: new Date().toISOString()
    };

    // Insert into database (upsert to handle duplicates)
    const { data, error } = await supabase
      .from('email_waitlist')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          source,
          tags,
          metadata,
          subscribed: true,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'email',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate (should be handled by upsert, but just in case)
      if (error.code === '23505') {
        return NextResponse.json({
          success: true,
          message: 'You\'re already on our list! We\'ll keep you updated.',
          alreadySubscribed: true
        });
      }

      throw error;
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed! Check your email for confirmation.',
      data: {
        email: data.email,
        source: data.source
      }
    });

  } catch (error: any) {
    console.error('Error in email-capture:', error);

    return NextResponse.json(
      {
        error: 'Subscription failed',
        message: 'Something went wrong. Please try again later.'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for admin stats (optional)
export async function GET(request: Request) {
  try {
    // TODO: Add admin authentication check here

    // Get total subscribers
    const { count: totalSubscribers } = await supabase
      .from('email_waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('subscribed', true);

    // Get by source
    const { data: bySource } = await supabase
      .from('email_waitlist')
      .select('source')
      .eq('subscribed', true);

    const sourceCounts = bySource?.reduce((acc: any, curr) => {
      acc[curr.source] = (acc[curr.source] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      totalSubscribers: totalSubscribers || 0,
      bySource: sourceCounts || {}
    });

  } catch (error) {
    console.error('Error fetching email stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
