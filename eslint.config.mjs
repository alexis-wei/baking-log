import coreWebVitalsConfig from "eslint-config-next/core-web-vitals";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [
  // Next.js native flat config: base rules + TypeScript + core web vitals
  ...coreWebVitalsConfig,

  // Prettier: disables conflicting rules then enforces formatting
  prettierConfig,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "error",
      // Downgraded to warn: these react-hooks@7 rules flag intentional
      // patterns, e.g. useEffect(() => setState(true), []) for mount detection.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
];
