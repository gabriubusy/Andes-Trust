import nextConfig from "eslint-config-next";

const config = [...nextConfig];

config[0].rules["react-hooks/set-state-in-effect"] = "off";

export default config;
