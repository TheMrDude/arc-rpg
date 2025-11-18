import { NextResponse } from 'next/server';

// Simple analytics tracking endpoint
// Logs events for now, can be extended to store in DB later

export async function POST(request: Request) {
  try {
    const { event, properties } = await request.json();

    // Log the event (in production, store in database or send to analytics service)
    console.log('[Track Event]', {
      event,
      properties,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Silently fail - don't let analytics break the app
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
