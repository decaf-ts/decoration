import { Constructor } from "../metadata/types";
import { DefaultFlavour } from "../constants";

type FlavourResolver = (model: Constructor) => string;
type PendingResolver = (target: any, flavour?: string) => void;

let flavourResolver: FlavourResolver | undefined;
let pendingResolver: PendingResolver | undefined;

/**
 * @description Registers a global flavour resolver.
 * @summary Sets the function responsible for determining the flavour of a model constructor.
 * @param {FlavourResolver} resolver Function that returns the flavour string for a given model.
 * @return {void}
 * @function registerFlavourResolver
 * @memberOf module:decoration
 */
export function registerFlavourResolver(resolver: FlavourResolver): void {
  flavourResolver = resolver;
}

/**
 * @description Resolves the flavour for a given model.
 * @summary Invokes the registered flavour resolver to determine the flavour of the provided model constructor. Returns the default flavour if no resolver is registered.
 * @param {Constructor} model Model constructor to resolve the flavour for.
 * @return {string} Resolved flavour identifier.
 * @function resolveFlavour
 * @memberOf module:decoration
 */
export function resolveFlavour(model: Constructor): string {
  if (!flavourResolver) return DefaultFlavour;
  return flavourResolver(model);
}

/**
 * @description Registers a global pending decorator resolver.
 * @summary Sets the function responsible for processing pending decorators for a target.
 * @param {PendingResolver} resolver Function that resolves pending decorators for a target and optional flavour.
 * @return {void}
 * @function registerPendingResolver
 * @memberOf module:decoration
 */
export function registerPendingResolver(resolver: PendingResolver): void {
  pendingResolver = resolver;
}

/**
 * @description Triggers resolution of pending decorators for a target.
 * @summary Invokes the registered pending resolver to process any pending decorators for the specified target and optional flavour.
 * @param {any} target Target object to resolve decorators for.
 * @param {string} [flavour] Optional flavour to use during resolution.
 * @return {void}
 * @function resolvePendingDecorators
 * @memberOf module:decoration
 */
export function resolvePendingDecorators(
  target: any,
  flavour?: string
): void {
  if (!pendingResolver) return;
  pendingResolver(target, flavour);
}
