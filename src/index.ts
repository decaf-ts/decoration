/**
 * @description Root entry point for the decoration package.
 * @summary Re-exports the builder API, decorator helpers, metadata utilities, and shared constants so consumers can import {@link Decoration}, {@link Metadata}, {@link DecorationKeys}, and {@link DefaultFlavour} from a single surface.
 * @module decoration
 */

import { Metadata } from "./metadata/index";

export * from "./decoration";
export * from "./metadata";
export * from "./constants";
export * from "./decorators";

/**
 * @description Current version of the decoration package.
 * @summary Stores the semantic version string registered through {@link Metadata.registerLibrary}.
 * @type {string}
 * @const VERSION
 * @memberOf module:decoration
 */
export const VERSION = "##VERSION##";

Metadata.registerLibrary("@decaf-ts/decoration", VERSION);
