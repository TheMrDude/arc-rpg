import { NextResponse } from 'next/server';
import { getBadge } from '@/lib/badges';

export const dynamic = 'force-dynamic';

/**
 * ERC-721 metadata for a Legendary Badge.
 *
 * The on-chain contract maps badgeId -> this URL (shared per badge type),
 * so this serves per-badge metadata, not per-token. The exact claim date and
 * owner for an individual token live in Supabase `badge_claims` and in the
 * mint transaction itself. Metadata is hosted on our own domain — no pinning
 * service, zero cost at rest.
 *
 * GET /api/badges/1  ->  { name, description, image, attributes, ... }
 */
export async function GET(request, { params }) {
  const { badgeId } = await params;
  const badge = getBadge(badgeId);

  if (!badge) {
    return NextResponse.json({ error: 'Unknown badge' }, { status: 404 });
  }

  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://habitquest.dev').replace(/\/$/, '');
  const rarity = badge.id === 5 ? 'Mythic' : badge.id === 4 ? 'Legendary' : 'Rare';

  const metadata = {
    name: `${badge.name} — HabitQuest Legendary Badge`,
    description: `${badge.description}\n\nA soulbound HabitQuest Legendary Badge: a permanent trophy that can never be revoked, expired, or transferred. It is yours to keep — or to burn — forever.`,
    image: `${base}/api/badges/${badge.id}/image`,
    external_url: `${base}/badges`,
    background_color: badge.color.replace('#', ''),
    attributes: [
      { trait_type: 'Milestone', value: badge.milestone },
      { trait_type: 'Badge', value: badge.name },
      { trait_type: 'Archetype', value: 'All Archetypes' },
      { trait_type: 'Collection', value: 'HabitQuest Legendary Badges — Season 1' },
      { trait_type: 'Rarity', value: rarity },
      { trait_type: 'Soulbound', value: 'Yes' },
    ],
  };

  return NextResponse.json(metadata, {
    headers: {
      // Metadata is stable per badge type; let marketplaces cache it.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
