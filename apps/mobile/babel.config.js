// apps/mobile/babel.config.js
module.exports = (api) => {
	api.cache(true);
	return {
		presets: ["expo-router/babel"],
		plugins: [],
	};
};
