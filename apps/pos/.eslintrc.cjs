module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  extends: ["eslint:recommended"],
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  ignorePatterns: ["dist/", "dist-electron/", "release/"],
  rules: {
    "no-undef": "off",
    "no-unused-vars": "off",
    "no-restricted-syntax": [
      "error",
      {
        selector: "TSAnyKeyword",
        message: "Usa un tipo explícito en lugar de any.",
      },
    ],
  },
};
