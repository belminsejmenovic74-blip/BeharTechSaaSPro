const projectRoot = __dirname;

const nextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
