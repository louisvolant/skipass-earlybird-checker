import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "public/**"],
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
