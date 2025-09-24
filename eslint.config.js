// ESLint flat config (ESLint v9+)
import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default [
  js.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**", "*.config.js"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
        process: "readonly",
        __dirname: "readonly",
        global: "readonly",
        self: "readonly",
        alert: "readonly",
        prompt: "readonly",
        confirm: "readonly",
        URLSearchParams: "readonly",
        MutationObserver: "readonly",
        Event: "readonly",
        module: "writable",
        require: "writable",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      import: importPlugin,
      "unused-imports": unusedImports,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      // Core quality
      "no-console": "off",
      "no-unused-vars": "off", // superseded by unused-imports
      "no-empty": "off", // Allow empty blocks in vendor code
      "no-undef": "warn", // Make undefined variables warnings instead of errors
      "unused-imports/no-unused-imports": "warn", // Make unused imports warnings
      "react/jsx-uses-react": "off", // React 17+ doesn't need React in scope
      "react/react-in-jsx-scope": "off", // React 17+ doesn't need React in scope

      // React & hooks
      "react/jsx-key": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Imports hygiene
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      "import/order": "off",
    },
  },
  {
    files: ["**/*.test.{js,jsx,ts,tsx}", "**/tests/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
      },
    },
  },
];