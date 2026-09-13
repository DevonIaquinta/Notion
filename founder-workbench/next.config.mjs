/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server actions are enabled by default in Next 14; keep body limit generous
    // for AI-assisted stage forms.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
