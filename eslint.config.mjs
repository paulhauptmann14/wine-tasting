import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local agent skill folders (gitignored, third-party scripts – not part of the app)
    ".claude/**",
    ".agents/**",
    // Vendored tesseract.js worker/core (minified third-party code, see public/tesseract/README.md)
    "public/tesseract/**",
  ]),
]);

export default eslintConfig;
