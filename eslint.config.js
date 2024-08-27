/* eslint-disable import-x/no-unresolved */
import hopeConfig, { config, tsParser } from "eslint-config-mister-hope";

export default config(
  ...hopeConfig,

  {
    ignores: ["**/dist/**", "**/node_modules/**"],
  },

  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        parser: tsParser,
        projectService: {
          allowDefaultProject: ["eslint.config.js"],
        },
        tsconfigDirName: import.meta.dirname,
      },
    },
  },

  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/prefer-nullish-coalescing": [
        "warn",
        {
          ignoreConditionalTests: true,
        },
      ],
      "@typescript-eslint/naming-convention": [
        "warn",
        {
          selector: "default",
          format: ["camelCase"],
        },
        {
          selector: ["variable"],
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
        },
        {
          selector: ["parameter"],
          format: ["camelCase", "PascalCase"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
        // allow css property like `line-width`
        {
          selector: ["property"],
          format: null,
          custom: {
            regex: "(^[a-z]+(?:-[a-z]+)*?$)",
            match: true,
          },
          filter: "(^[a-z]+(?:-[a-z]+)*?$)",
        },
        {
          selector: ["property"],
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
        {
          selector: "import",
          format: ["PascalCase", "camelCase"],
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
      ],
    },
  },
);
