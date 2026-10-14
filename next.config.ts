import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  distDir: process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? '.next-demo' : '.next',
  serverExternalPackages: ['@prisma/client'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default config;