import { getPackage } from "@decaf-ts/utils";

/**
 * @description Test root directory configuration
 * - "src": Test against source TypeScript files (default)
 * - "lib": Test against CommonJS transpiled output
 * - "dist": Test against bundled distribution
 */
export const TEST_ROOT: "src" | "lib" | "dist" = (process.env.TEST_ROOT ||
  "src") as "src" | "lib" | "dist";

const pkg = getPackage();

/**
 * @description Computes the export path based on TEST_ROOT
 */
function getExportPath(): string {
  const basePath = `../../${TEST_ROOT}`;

  switch (TEST_ROOT) {
    case "dist":
      return basePath + `/${pkg["name"].split("/")[1]}.cjs`;
    case "lib":
      return basePath + `/index.cjs`;
    default:
      return basePath + `/index`;
  }
}

/**
 * @description The computed export path for the library
 */
export const EXPORT_PATH = getExportPath();

/**
 * @description Configuration for E2E tests
 */
export interface E2eConfig {
  testRoot: "src" | "lib" | "dist";
  exportPath: string;
  packageName: string;
  packageVersion: string;
}

/**
 * @description E2E test configuration object
 */
export const e2eConfig: E2eConfig = {
  testRoot: TEST_ROOT,
  exportPath: EXPORT_PATH,
  packageName: pkg["name"],
  packageVersion: pkg["version"],
};

/**
 * @description Dynamically loads the library from the configured path
 * @returns Promise resolving to the library module
 */
export async function getLibrary(): Promise<
  typeof import("../../src/index")
> {
  return await import(EXPORT_PATH);
}

// Re-export all types from source for TypeScript type checking
// This provides type safety while allowing runtime testing against different builds
export type * from "../../src/index";

// Static re-exports of decorators for TypeScript transpilation
// These are needed because decorators must be resolved at compile time
// The actual runtime behavior comes from getLibrary() which loads from TEST_ROOT
export {
  // Core decorators
  metadata,
  metadataArray,
  prop,
  method,
  param,
  paramMetadata,
  propMetadata,
  methodMetadata,
  apply,
  // Class decorators
  uses,
  description,
} from "../../src/index";
