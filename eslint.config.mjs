import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["./src/*.ts"] },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "arrow-body-style": "error",
      "prefer-arrow-callback": "error",
      "no-restricted-syntax": [
        "error",
        "FunctionExpression",
        "FunctionDeclaration",
      ],
    },
  },
];
