import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "node_modules/**",
      "dist/**",
      "public/**",
      "cloudflare-env.d.ts",
    ],
  },
  ...nextVitals,
  {
    rules: {
      // Data-fetching on mount is a valid pattern; this rule is too strict here.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
