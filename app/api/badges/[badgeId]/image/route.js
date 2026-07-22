import { getBadge } from '@/lib/badges';
import { buildBadgeSvg } from '@/lib/badge-art';

export const dynamic = 'force-dynamic';

/**
 * The badge image referenced by the ERC-721 metadata. Self-contained SVG,
 * served from our own domain (no pinning service, zero cost at rest).
 *
 * GET /api/badges/1/image  ->  image/svg+xml
 */
export async function GET(request, { params }) {
  const { badgeId } = await params;
  const badge = getBadge(badgeId);

  if (!badge) {
    return new Response('Unknown badge', { status: 404 });
  }

  const svg = buildBadgeSvg(badge, { earned: true });

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
