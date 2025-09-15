/**
 * @description Root entry point for the decoration module
 * @summary Aggregates and re-exports the public API of the decoration library, including core classes like {@link Decoration}, utility decorators, metadata helpers, and constants. This module is the primary import surface for consumers and exposes:
 * - Core builder: {@link Decoration}
 * - Decorator utilities: {@link module:decoration | decorators in ./decorators}
 * - Metadata utilities: {@link Metadata}
 * - Constants and enums: {@link DecorationKeys}, {@link DefaultFlavour}
 *
 * @module decoration
 */

import { Metadata } from "./metadata/index";

export * from "./decoration";
export * from "./metadata";
export * from "./constants";
export * from "./decorators";

/**
 * @description Current version of the reflection package
 * @summary Stores the semantic version number of the package
 * @const VERSION
 * @memberOf module:decoration
 */
export const VERSION = "##VERSION##";

Metadata.registerLibrary("@decaf-ts/decoration", VERSION);
