import type { NextConfig } from "next";

import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  disable: false, // Enable even in dev to test
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/app',
  assetPrefix: '/app',
  // Required for static export to work with dynamic client-side routing on some hosts, 
  // though Netlify usually handles clean URLs.
  // We might need an _redirects file for SPA routing.
  images: { unoptimized: true } // Required for static export if using next/image
};

export default withPWA(nextConfig);
