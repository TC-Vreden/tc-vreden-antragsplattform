const isLocalCodexBuild = process.env.TC_VREDEN_DISABLE_NEXT_CLEAN === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  cleanDistDir: !isLocalCodexBuild,
  eslint: {
    ignoreDuringBuilds: isLocalCodexBuild
  },
  experimental: isLocalCodexBuild ? {
    webpackBuildWorker: false
  } : {},
  typedRoutes: true,
  typescript: {
    ignoreBuildErrors: isLocalCodexBuild
  }
};

export default nextConfig;
