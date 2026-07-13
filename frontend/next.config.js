/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://127.0.0.1:8000";
    
    // Always rewrite if NEXT_PUBLIC_API_URL is set (production via Render) or if in development
    if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_API_URL) {
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
    }
    return [];
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
