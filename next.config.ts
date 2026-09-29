import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // A home ("/") é a landing page institucional, servida de public/site.
      beforeFiles: [{ source: "/", destination: "/site/index.html" }],
    };
  },
};

export default nextConfig;
