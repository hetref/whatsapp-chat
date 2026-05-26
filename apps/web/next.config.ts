import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/db'],
  // async rewrites() {
  //   const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

  //   return {
  //     beforeFiles: [
  //       {
  //         source: '/api/flow-endpoint',
  //         destination: `${apiBase}/api/flow-endpoint`,
  //       },
  //       {
  //         source: '/api/conversations',
  //         destination: `${apiBase}/api/conversations`,
  //       },
  //       {
  //         source: '/api/messages/:path*',
  //         destination: `${apiBase}/api/messages/:path*`,
  //       },
  //       {
  //         source: '/api/groups/:path*',
  //         destination: `${apiBase}/api/groups/:path*`,
  //       },
  //       {
  //         source: '/api/templates/:path*',
  //         destination: `${apiBase}/api/templates/:path*`,
  //       },
  //       {
  //         source: '/api/send-message',
  //         destination: `${apiBase}/api/send-message`,
  //       },
  //       {
  //         source: '/api/send-template',
  //         destination: `${apiBase}/api/send-template`,
  //       },
  //       {
  //         source: '/api/send-media/:path*',
  //         destination: `${apiBase}/api/send-media/:path*`,
  //       },
  //       {
  //         source: '/api/media',
  //         destination: `${apiBase}/api/media`,
  //       },
  //       {
  //         source: '/api/media/:path*',
  //         destination: `${apiBase}/api/media/:path*`,
  //       },
  //       {
  //         source: '/api/razorpay/webhook',
  //         destination: `${apiBase}/api/razorpay/webhook`,
  //       },
  //       {
  //         source: '/api/razorpay/:path*',
  //         destination: `${apiBase}/api/razorpay/:path*`,
  //       },
  //       {
  //         source: '/api/subscription/:path*',
  //         destination: `${apiBase}/api/subscription/:path*`,
  //       },
  //     ],
  //     afterFiles: [],
  //     fallback: [],
  //   };
  // },
  // async headers() {
  //   return [
  //     {
  //       source: '/(.*)',
  //       headers: [
  //         { key: 'X-Frame-Options', value: 'DENY' },
  //         { key: 'X-Content-Type-Options', value: 'nosniff' },
  //         { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  //         { key: 'X-DNS-Prefetch-Control', value: 'on' },
  //         { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  //         { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  //       ],
  //     },
  //   ];
  // },
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
