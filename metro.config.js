const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable WASM assets for expo-sqlite web support
config.resolver.assetExts.push("wasm");

module.exports = withNativewind(config);