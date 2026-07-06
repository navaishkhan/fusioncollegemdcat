/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // In production (Vercel), /api/* is routed by vercel.json to the Python backend
    // In development, we proxy to the local FastAPI server
    if (process.env.NODE_ENV === "development") {
      const apiUrl = process.env.API_URL || "http://127.0.0.1:8000";
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
};

module.exports = nextConfig;
