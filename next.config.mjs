/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@xenova/transformers",
      "pdf-parse",
      "onnxruntime-node",
      "sharp"
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "onnxruntime-node", "sharp"];
    }
    return config;
  },
};

export default nextConfig;
