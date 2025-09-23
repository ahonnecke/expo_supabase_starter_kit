// apps/web/next.config.mjs
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
	transpilePackages: [
		"react-native-web",
		"tamagui",
		"@tamagui/*",
		"@supa/ui",
		"@supa/shared",
		"@supa/supabase",
		"@rentinity/blockchain",
	],
	experimental: {
		scrollRestoration: true,
	},
	output: "standalone",

	webpack: (config, { isServer }) => {
		// Add blockchain package to webpack resolve paths
		config.resolve.alias = {
			...config.resolve.alias,
			"@rentinity/blockchain": path.resolve(
				__dirname,
				"../../packages/blockchain/src",
			),
			"@rentinity/blockchain/src/wallet-context": path.resolve(
				__dirname,
				"../../packages/blockchain/src/wallet-context",
			),
		};

		return config;
	},
};
