import nextConfig from "eslint-config-next";

const config = [
  // Ignorar carpetas auto-generadas por Hardhat / build artifacts
  {
    ignores: [
      "typechain-types/**",
      "artifacts/**",
      "cache-hardhat/**",
      "build/**",
      ".next/**",
    ],
  },
  ...nextConfig,
];

config[1].rules["react-hooks/set-state-in-effect"] = "off";
// react-hook-form expone `watch()` como función no-memoizable; el React Compiler
// lo marca como warning aunque el patrón sea correcto y necesario.
config[1].rules["react-hooks/incompatible-library"] = "off";
// `Date.now()` para badges de "vencido / por vencer" es un caso legítimo —
// queremos que el valor cambie en cada render. La regla del React Compiler
// es demasiado estricta para este uso.
config[1].rules["react-hooks/purity"] = "off";

export default config;
