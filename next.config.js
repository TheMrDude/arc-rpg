/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { webpack }) => {
    // The wagmi/viem wallet stack (used only by the optional /badges claim
    // flow) pulls in Coinbase's baseAccount connector, which statically
    // references optional payment packages (@x402/*) and node-only libs we
    // never use — we only use the `injected` connector. Ignore them so the
    // build doesn't fail resolving deps that will never run.
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// }),
    );
    config.externals = config.externals || [];
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    // Optional React-Native storage referenced by @metamask/sdk (unused; we
    // only use the injected connector).
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
  async redirects() {
    return [
      {
        source: '/blog/how-to-build-habit-stack-that-sticks',
        destination: '/blog/complete-guide-habit-stacking',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          }
        ],
      },
      {
        // Special headers for Stripe webhook (needs raw body)
        source: '/api/stripe-webhook',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json'
          }
        ],
      }
    ];
  },
}

module.exports = nextConfig
