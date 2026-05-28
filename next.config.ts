import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@polkadot/api",
    "@polkadot/api-contract",
    "@polkadot/util",
    "@polkadot/util-crypto",
    "@polkadot/keyring",
    "@polkadot/types",
    "@polkadot/extension-dapp",
    "@polkadot/rpc-provider",
    "@polkadot/rpc-core",
  ],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
