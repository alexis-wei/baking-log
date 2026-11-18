// Photos and videos are served from the R2 bucket's public address. Every
// <Image> is unoptimized, but allow the host anyway so that stays a choice.
const mediaHost = (() => {
  try {
    return new URL(process.env.R2_PUBLIC_URL ?? "").hostname;
  } catch {
    return undefined;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // libSQL ships native bindings (used for the local dev database file).
  serverExternalPackages: ["@libsql/client", "libsql"],
  images: {
    remotePatterns: mediaHost
      ? [{ protocol: "https", hostname: mediaHost, pathname: "/**" }]
      : [],
  },
  async redirects() {
    return [
      // The log used to live at alexiswei.com/baking. Old links that land
      // here with the /baking prefix still find their page.
      { source: "/baking", destination: "/", permanent: true },
      { source: "/baking/:path*", destination: "/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
