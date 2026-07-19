import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    skipTrailingSlashRedirect:true,
    async rewrites() {
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:4000/api/:path*",
        },
        { source: "/proxy/:path*", 
          destination: "http://localhost:4000/proxy/:path*" 
        },

      ];
    },
};

export default nextConfig;