export function resolveRequestOrigin(request) {
  const candidates = [
    request.headers?.get?.('origin'),
    request.nextUrl?.origin,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    (() => {
      try {
        const url = new URL(request.url);
        return `${url.protocol}//${url.host}`;
      } catch (error) {
        return null;
      }
    })(),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    try {
      return new URL(candidate).origin;
    } catch (error) {
      // Ignore invalid candidate and continue to the next option
    }
  }

  throw new Error('Unable to determine application origin. Set NEXT_PUBLIC_SITE_URL or SITE_URL.');
}
