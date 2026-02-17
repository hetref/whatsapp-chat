import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      // AWS S3 regional patterns
      {
        protocol: 'https',
        hostname: '**.s3.*.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      // Your specific S3 bucket
      {
        protocol: 'https',
        hostname: 'wassupchat.s3.ap-south-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      // Generic S3 patterns
      {
        protocol: 'https',
        hostname: 's3.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      // S3 with region patterns
      {
        protocol: 'https',
        hostname: 's3-*.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      // Additional S3 patterns for different regions
      {
        protocol: 'https',
        hostname: 's3.*.amazonaws.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
