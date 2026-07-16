import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@mapvideo/shared', '@mapvideo/db'],
};

export default nextConfig;
