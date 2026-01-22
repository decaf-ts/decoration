import { Constructor } from "../metadata/types";
import { DefaultFlavour } from "../constants";

type FlavourResolver = (model: Constructor) => string;
type PendingResolver = (target: any, flavour?: string) => void;

let flavourResolver: FlavourResolver | undefined;
let pendingResolver: PendingResolver | undefined;

export function registerFlavourResolver(resolver: FlavourResolver): void {
  flavourResolver = resolver;
}

export function resolveFlavour(model: Constructor): string {
  if (!flavourResolver) return DefaultFlavour;
  return flavourResolver(model);
}

export function registerPendingResolver(resolver: PendingResolver): void {
  pendingResolver = resolver;
}

export function resolvePendingDecorators(
  target: any,
  flavour?: string
): void {
  if (!pendingResolver) return;
  pendingResolver(target, flavour);
}
