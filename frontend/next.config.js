/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // In production, always proxy to the API backend.
    // NEXT_PUBLIC_API_URL must be set in Vercel environment variables.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${apiUrl}/health`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
