import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
