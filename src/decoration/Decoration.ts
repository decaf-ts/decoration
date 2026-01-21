import {
  DecorationBuilderBuild,
  DecorationBuilderEnd,
  DecorationBuilderMid,
  DecorationBuilderStart,
  FlavourResolver,
  IDecorationBuilder,
} from "./types";
import { DecorationKeys, DecorationState, DefaultFlavour } from "../constants";
import { Metadata } from "../metadata/Metadata";
import { method, prop, uses } from "../decorators";

/**
 * @description Default resolver that returns the current default flavour.
 * @summary Resolves the flavour for a given target by always returning the library's `DefaultFlavour` value.
 * @param {object} target Target object being decorated.
 * @return {string} Resolved flavour identifier.
 * @function flavourResolver
 * @memberOf module:decoration
 */
function flavourResolver(target: object): string {
  const owner = Metadata.constr(
    typeof target === "function" ? target : (target as any)?.constructor
  );
  const meta = Metadata["innerGet"](
    Metadata.Symbol(owner),
    DecorationKeys.FLAVOUR
  );
  if (meta && meta !== Decoration.defaultFlavour) return meta;
  const registered =
    typeof Metadata["registeredFlavour"] === "function"
      ? Metadata.registeredFlavour(owner)
      : undefined;
  if (registered && registered !== Decoration.defaultFlavour) return registered;
  return meta ?? Decoration.defaultFlavour;
}

/**
 * @description Union type covering supported decorator kinds.
 * @summary Represents any of the standard TypeScript decorator signatures (class, property, or method), enabling flexible registration and application within the Decoration system.
 * @template T
 * @typeDef DecoratorTypes
 * @memberOf module:decoration
 */
export type DecoratorTypes =
  | ClassDecorator
  | PropertyDecorator
  | MethodDecorator;

/**
 * @description Type definition for a decorator factory function.
 * @summary Represents a function that accepts arbitrary arguments and returns a concrete decorator function to be applied to a target.
 * @template A
 * @typeDef DecoratorFactory
 * @memberOf module:decoration
 */
export type DecoratorFactory = (...args: any[]) => DecoratorTypes;

/**
 * @description Argument bundle for a decorator factory.
 * @summary Object form used to defer decorator creation, carrying both the factory function and its argument list to be invoked later during application.
 * @typeDef DecoratorFactoryArgs
 * @property {DecoratorFactory} decorator Factory function that produces a decorator when invoked.
 * @property {any[]} args List of arguments to pass to the decorator factory.
 * @memberOf module:decoration
 */
export type DecoratorFactoryArgs = {
  decorator: DecoratorFactory;
  args: any[];
};

/**
 * @description Union that represents either a ready-to-apply decorator or a factory with arguments.
 * @summary Allows registering decorators in two forms: as direct decorator functions or as deferred factories paired with their argument lists for later instantiation.
 * @typeDef DecoratorData
 * @memberOf module:decoration
 */
export type DecoratorData = DecoratorTypes | DecoratorFactoryArgs;
export type ExtendDecoratorData =
  | DecoratorTypes
  | Omit<DecoratorFactoryArgs, "args">;
type StoredDecoratorData = DecoratorData | ExtendDecoratorData;

type MetadataDiffEntry = {
  path: (string | symbol)[];
  previousValue: any;
  existed: boolean;
};

function isPlainObject(value: unknown): value is Record<string | symbol, any> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, any>).constructor === Object
  );
}

function cloneMetadataValue<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => cloneMetadataValue(item)) as unknown as T;
  }
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }
  if (value instanceof Set) {
    return new Set(
      Array.from(value).map((item) => cloneMetadataValue(item))
    ) as unknown as T;
  }
  if (value instanceof Map) {
    return new Map(
      Array.from(value.entries()).map(([k, v]) => [k, cloneMetadataValue(v)])
    ) as unknown as T;
  }
  if ((value as Record<string, any>).constructor !== Object) {
    return value;
  }
  const clone: Record<string | symbol, any> = {};
  Reflect.ownKeys(value as Record<string | symbol, any>).forEach((key) => {
    clone[key as any] = cloneMetadataValue(
      (value as Record<string | symbol, any>)[key as any]
    );
  });
  return clone as T;
}

function diffMetadataBuckets(
  before?: Record<string | symbol, any>,
  after?: Record<string | symbol, any>,
  basePath: (string | symbol)[] = [],
  result: MetadataDiffEntry[] = []
): MetadataDiffEntry[] {
  const keys = new Set<PropertyKey>([
    ...(before ? Reflect.ownKeys(before) : []),
    ...(after ? Reflect.ownKeys(after) : []),
  ]);
  keys.forEach((key) => {
    const prevExists = before
      ? Object.prototype.hasOwnProperty.call(before, key as any)
      : false;
    const nextExists = after
      ? Object.prototype.hasOwnProperty.call(after, key as any)
      : false;
    const prevValue = prevExists ? before?.[key as any] : undefined;
    const nextValue = nextExists ? after?.[key as any] : undefined;
    if (!nextExists) {
      result.push({
        path: [...basePath, key as string | symbol],
        previousValue: cloneMetadataValue(prevValue),
        existed: true,
      });
      return;
    }
    if (!prevExists) {
      if (isPlainObject(nextValue)) {
        diffMetadataBuckets(
          undefined,
          nextValue as Record<string | symbol, any>,
          [...basePath, key as string | symbol],
          result
        );
        return;
      }
      result.push({
        path: [...basePath, key as string | symbol],
        previousValue: undefined,
        existed: false,
      });
      return;
    }
    if (isPlainObject(prevValue) && isPlainObject(nextValue)) {
      diffMetadataBuckets(
        prevValue as Record<string | symbol, any>,
        nextValue as Record<string | symbol, any>,
        [...basePath, key as string | symbol],
        result
      );
      return;
    }
    if (prevValue !== nextValue) {
      result.push({
        path: [...basePath, key as string | symbol],
        previousValue: cloneMetadataValue(prevValue),
        existed: true,
      });
    }
  });
  return result;
}

function cloneArgsOverrides(
  overrides?: Record<number, any[]>
): Record<number, any[]> | undefined {
  if (!overrides) return undefined;
  const clone: Record<number, any[]> = {};
  Object.keys(overrides).forEach((key) => {
    clone[key as any] = overrides[key as any].map((arg) =>
      typeof arg === "object" && arg !== null
        ? cloneMetadataValue(arg)
        : arg
    );
  });
  return clone;
}

function getNodeAtPath(
  bucket: Record<string | symbol, any>,
  path: (string | symbol)[]
): Record<string | symbol, any> | undefined {
  let current: Record<string | symbol, any> | undefined = bucket;
  for (const segment of path) {
    if (!current || !isPlainObject(current[segment as any])) {
      return undefined;
    }
    current = current[segment as any];
  }
  return current;
}

function pruneEmptyAncestors(
  bucket: Record<string | symbol, any>,
  path: (string | symbol)[]
): void {
  for (let i = path.length; i > 0; i--) {
    const ancestorPath = path.slice(0, i);
    const parentPath = ancestorPath.slice(0, -1);
    const key = ancestorPath[ancestorPath.length - 1];
    const parent =
      parentPath.length === 0
        ? bucket
        : getNodeAtPath(bucket, parentPath);
    if (!parent || !isPlainObject(parent)) break;
    const value = parent[key as any];
    if (!isPlainObject(value) || Reflect.ownKeys(value).length > 0) break;
    delete parent[key as any];
  }
}

interface PendingDecorator {
  owner: any;
  target: any;
  propertyKey?: string | symbol;
  descriptor?: TypedPropertyDescriptor<any> | number;
  callback: (
    flavour: string,
    overrides?: Record<number, any[]>
  ) => PropertyDecorator | MethodDecorator;
  argsOverride?: Record<number, any[]>;
  argsFactory?: () => Record<number, any[]> | undefined;
  key: string; // unique identifier
  lastAppliedPass?: number;
  lastAppliedFlavour?: string;
  metadataDiff?: MetadataDiffEntry[];
  descriptorSnapshot?: PropertyDescriptor | undefined;
  descriptorWasOwn?: boolean;
  definitionKey?: string;
}

interface TargetDecorationState {
  pending: PendingDecorator[];
  flavour?: string;
  directApply?: boolean;
  resolved?: boolean;
  lastAppliedFlavour?: string;
  appliedCount?: number;
  applying?: boolean;
  passId?: number;
  resolveScheduled?: boolean;
}

/**
 * @description A decorator management class that handles flavoured decorators.
 * @summary The Decoration class provides a builder pattern for creating and managing decorators with different flavours. It supports registering, extending, and applying decorators with context-aware flavour resolution, allowing framework-specific implementations while maintaining a consistent API.
 * @template T Type of the decorator (ClassDecorator | PropertyDecorator | MethodDecorator).
 * @param {string} [flavour=DefaultFlavour] Optional flavour parameter for the decorator context.
 * @class
 * @example
 * ```typescript
 * // Create a new decoration for 'component' with default flavour
 * const componentDecorator = new Decoration()
 *   .for('component')
 *   .define(customComponentDecorator);
 *
 * // Create a flavoured decoration
 * const vueComponent = new Decoration('vue')
 *   .for('component')
 *   .define(vueComponentDecorator);
 *
 * // Apply the decoration
 * @componentDecorator
 * class MyComponent {}
 * ```
 * @mermaid
 * sequenceDiagram
 *   participant C as Client
 *   participant D as Decoration
 *   participant R as FlavourResolver
 *   participant F as DecoratorFactory
 *
 *   C->>D: new Decoration(flavour)
 *   C->>D: for(key)
 *   C->>D: define(decorators)
 *   D->>D: register(key, flavour, decorators)
 *   D->>F: decoratorFactory(key, flavour)
 *   F->>R: resolve(target)
 *   R-->>F: resolved flavour
 *   F->>F: apply decorators
 *   F-->>C: decorated target
 */
export class Decoration implements IDecorationBuilder {
  static defaultFlavour = DefaultFlavour;

  private static targetStates: WeakMap<any, TargetDecorationState> =
    new WeakMap();

  /**
   * @description Static map of registered decorators.
   * @summary Stores all registered decorators organised by key and flavour.
   */
  private static decorators: Record<
    string,
    Record<
      string,
      {
        decorators?: Set<DecoratorData>;
        extras?: Set<StoredDecoratorData>;
      }
    >
  > = {};

  /**
   * @description Function to resolve flavour from a target.
   * @summary Resolver function that determines the appropriate flavour for a given target.
   */
  private static flavourResolver: FlavourResolver = flavourResolver;

  /**
   * @description Set of decorators for the current context.
   */
  private decorators?: Set<DecoratorData>;

  /**
   * @description Set of additional decorators.
   */
  private extras?: Set<StoredDecoratorData>;

  /**
   * @description Current decorator key.
   */
  private key?: string;

  constructor(private flavour: string = Decoration.defaultFlavour) {}

  /**
   * Register a decorator operation to be executed after class decorator runs.
   * This solves the execution order issue: property decorators run before class decorators.
   *
   * @param target - The class being decorated
   * @param callback - Function to execute once flavour is resolved
   * @param propertyKey - Optional property key for property decorators
   * @returns Unique key for this registration
   */
  private static getTargetState(owner: any): TargetDecorationState {
    if (!owner) {
      throw new Error("Invalid target provided to Decoration state tracker");
    }
    let state = this.targetStates.get(owner);
    if (!state) {
      state = { pending: [], flavour: undefined, directApply: false };
      this.targetStates.set(owner, state);
    }
    return state;
  }

  private static applyPendingEntry(
    entry: PendingDecorator,
    flavour: string
  ): void {
    const metadataStore = (Metadata as any)["_metadata"] as Record<
      symbol,
      Record<string | symbol, any>
    >;
    const metadataSymbol = Metadata.Symbol(entry.owner);
    const beforeSnapshot =
      typeof entry.metadataDiff === "undefined"
        ? cloneMetadataValue(metadataStore[metadataSymbol])
        : undefined;
    try {
      if (
        typeof entry.propertyKey !== "undefined" &&
        typeof entry.descriptorSnapshot === "undefined" &&
        entry.target
      ) {
        const currentDescriptor = Object.getOwnPropertyDescriptor(
          entry.target,
          entry.propertyKey
        );
        entry.descriptorWasOwn = Object.prototype.hasOwnProperty.call(
          entry.target,
          entry.propertyKey
        );
        entry.descriptorSnapshot = currentDescriptor
          ? { ...currentDescriptor }
          : undefined;
      }
      const overridesForCall = entry.argsFactory
        ? entry.argsFactory()
        : cloneArgsOverrides(entry.argsOverride);
      const descriptorResult = entry.callback(flavour, overridesForCall)(
        entry.target,
        entry.propertyKey as string | symbol,
        entry.descriptor as TypedPropertyDescriptor<any>
      );

      if (
        typeof entry.propertyKey !== "undefined" &&
        descriptorResult &&
        entry.target
      ) {
        Object.defineProperty(
          entry.target,
          entry.propertyKey,
          descriptorResult as PropertyDescriptor
        );
      }
      if (
        typeof entry.propertyKey !== "undefined" &&
        typeof entry.descriptor === "undefined"
      ) {
        // Ensure property metadata is always registered for member decorators.
        prop()(entry.owner ?? entry.target, entry.propertyKey);
      }
      if (typeof entry.metadataDiff === "undefined") {
        const afterSnapshot = cloneMetadataValue(metadataStore[metadataSymbol]);
        entry.metadataDiff = diffMetadataBuckets(
          beforeSnapshot as Record<string | symbol, any> | undefined,
          afterSnapshot as Record<string | symbol, any> | undefined
        );
      }
    } catch (error) {
      console.error(
        `Error resolving pending decorator for ${
          entry.owner?.name || "anonymous"
        }.${String(entry.propertyKey)}`,
        error
      );
    }
  }

  protected static markPending(owner: any): void {
    if (!owner) return;
    const state = this.getTargetState(owner);
    state.resolved = false;
    if (!state.flavour) state.flavour = Decoration.defaultFlavour;
    Metadata.set(owner, DecorationKeys.DECORATION, DecorationState.PENDING);
  }

  private static scheduleDefaultResolve(owner: any): void {
    if (!owner) return;
    const state = this.getTargetState(owner);
    if (state.resolveScheduled || state.resolved || state.applying) return;
    state.resolveScheduled = true;
    Promise.resolve().then(() => {
      state.resolveScheduled = false;
      if (!state.resolved) {
        this.resolvePendingDecorators(owner);
      }
    });
  }

  protected static registerPendingDecorator(
    owner: any,
    target: any,
    callback: (
      flavour: string,
      overrides?: Record<number, any[]>
    ) => PropertyDecorator | MethodDecorator,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any> | number,
    argsOverride?: Record<number, any[]>,
    definitionKey?: string
  ): string {
    const key = `${
      owner?.name || "anonymous"
    }:${String(propertyKey || "class")}:${Date.now()}:${Math.random()}`;

    const state = this.getTargetState(owner);
    const argsOverrideClone = cloneArgsOverrides(argsOverride);
    const entry: PendingDecorator = {
      owner,
      target,
      propertyKey,
      descriptor,
      callback,
      argsOverride: argsOverrideClone,
      argsFactory: () => cloneArgsOverrides(argsOverrideClone),
      key,
      definitionKey,
    };

    const applyImmediately = () => {
      const flavourToUse =
        state.flavour ||
        Metadata.get(owner, DecorationKeys.FLAVOUR) ||
        Decoration.defaultFlavour;
      this.applyPendingEntry(entry, flavourToUse);
      entry.lastAppliedPass = state.passId;
      entry.lastAppliedFlavour = flavourToUse;
      return flavourToUse;
    };

    const registerEntry = () => {
      state.pending.push(entry);
      return entry;
    };

    if (state.directApply) {
      registerEntry();
      const flavourToUse = applyImmediately();
      state.appliedCount = state.pending.length;
      state.flavour = flavourToUse;
      Metadata.set(owner, DecorationKeys.DECORATION, true);
      return key;
    }

    registerEntry();

    if (state.applying) {
      applyImmediately();
      return key;
    }

    if (Decoration.flavourResolver !== flavourResolver) {
      try {
        const eagerFlavour = Decoration.flavourResolver(owner);
        if (eagerFlavour && eagerFlavour !== Decoration.defaultFlavour) {
          this.resolvePendingDecorators(owner, eagerFlavour);
          return key;
        }
      } catch {
        // Ignore resolver errors during eager resolution attempts.
      }
    }

    this.scheduleDefaultResolve(owner);
    return key;
  }

  protected static resolvePendingDecorators(
    target: any,
    flavour?: string
  ): void {
    const owner =
      typeof target === "function" ? target : target?.constructor || target;
    if (!owner) return;
    const state = this.getTargetState(owner);
    state.resolveScheduled = false;
    if (!state.pending.length && !flavour) return;

    const resolvedFlavour =
      flavour ||
      state.flavour ||
      Metadata.get(owner, DecorationKeys.FLAVOUR) ||
      Decoration.defaultFlavour;

    if (state.applying) return;

    const cursor = state.appliedCount || 0;
    if (
      !flavour &&
      state.lastAppliedFlavour === resolvedFlavour &&
      cursor >= state.pending.length
    ) {
      return;
    }

    const shouldFinalize =
      Boolean(flavour && flavour !== Decoration.defaultFlavour) ||
      state.directApply;
    if (!state.pending.length) return;

    const currentPass = (state.passId || 0) + 1;
    state.passId = currentPass;
    state.applying = true;
    try {
    if (shouldFinalize) {
      for (const entry of state.pending) {
        if (!entry) continue;
        if (entry.lastAppliedPass === currentPass) continue;
        const hasOverride = this.shouldOverrideEntry(
          entry,
          resolvedFlavour
        );
        const hasBeenApplied =
          typeof entry.metadataDiff !== "undefined" ||
          typeof entry.descriptorSnapshot !== "undefined";
        if (!hasBeenApplied) {
          this.applyPendingEntry(entry, resolvedFlavour);
          entry.lastAppliedPass = currentPass;
          entry.lastAppliedFlavour = resolvedFlavour;
          continue;
        }
        if (
          entry.lastAppliedFlavour === resolvedFlavour ||
          !hasOverride
        ) {
          entry.lastAppliedPass = currentPass;
          continue;
        }
        if (entry.metadataDiff?.length) {
          revertMetadataDiff(entry.owner, entry.metadataDiff);
        }
        restorePropertyDescriptor(entry);
        this.applyPendingEntry(entry, resolvedFlavour);
        entry.lastAppliedPass = currentPass;
        entry.lastAppliedFlavour = resolvedFlavour;
      }
    } else {
      let index = cursor;
      while (index < state.pending.length) {
        const entry = state.pending[index++];
        if (!entry) continue;
        if (entry.lastAppliedPass === currentPass) continue;
        this.applyPendingEntry(entry, resolvedFlavour);
        entry.lastAppliedPass = currentPass;
        entry.lastAppliedFlavour = resolvedFlavour;
      }
      state.appliedCount = state.pending.length;
    }
    } finally {
      state.applying = false;
    }

    state.flavour = resolvedFlavour;
    state.resolved = true;
    state.lastAppliedFlavour = resolvedFlavour;
    if (shouldFinalize) {
      state.appliedCount = state.pending.length;
      if (resolvedFlavour !== Decoration.defaultFlavour) {
        state.directApply = true;
      }
    }

    Metadata.set(owner, DecorationKeys.DECORATION, true);
  }

  /**
   * @description Sets the key for the decoration builder.
   * @summary Initialises a new decoration chain with the specified key.
   * @param {string} key Identifier for the decorator.
   * @return {DecorationBuilderMid} Builder instance for method chaining.
   */
  for(key: string): DecorationBuilderMid {
    this.key = key;
    return this;
  }

  /**
   * @description Adds decorators to the current context.
   * @summary Internal method to add decorators with addon support.
   * @param {boolean} [addon=false] Indicates whether the decorators are additive extras.
   * @param {...DecoratorData} decorators Decorators to register for the configured key.
   * @return {this} Current instance for chaining.
   */
  private decorate(
    addon: boolean = false,
    ...decorators: StoredDecoratorData[]
  ): this {
    if (!this.key)
      throw new Error("key must be provided before decorators can be added");
    if (
      (!decorators || !decorators.length) &&
      !addon &&
      this.flavour !== Decoration.defaultFlavour
    )
      throw new Error(
        "Must provide overrides or addons to override or extend decaf's decorators"
      );
    // For addon (extend) we merge with existing extras; for base (define) we replace
    if (addon) {
      (this as any).extras = new Set([
        ...(this.extras || new Set()).values(),
        ...decorators,
      ]);
    } else {
      // replace any previously configured base decorators on this builder
      (this as any).decorators = new Set([...decorators]);
    }

    return this;
  }

  private snapshotDecoratorArgs(): Record<number, any[]> | undefined {
    if (!this.decorators || !this.decorators.size) return undefined;
    const overrides: Record<number, any[]> = {};
    Array.from(this.decorators.values()).forEach((entry, index) => {
      if (
        typeof entry === "object" &&
        "args" in entry &&
        Array.isArray(entry.args)
      ) {
        overrides[index] = entry.args.map((arg) =>
          typeof arg === "object" && arg !== null
            ? cloneMetadataValue(arg)
            : arg
        );
      }
    });
    return Object.keys(overrides).length ? overrides : undefined;
  }

  /**
   * @description Defines the base decorators.
   * @summary Sets the primary decorators for the current context.
   * @param {...DecoratorData} decorators Decorators to define.
   * @return {DecorationBuilderEnd} Builder instance for finishing the chain (also implements DecorationBuilderBuild).
   */
  define(
    ...decorators: DecoratorData[]
  ): DecorationBuilderEnd & DecorationBuilderBuild {
    if (
      decorators.find((d) => typeof d === "object") &&
      decorators.length !== 1
    )
      throw new Error(
        `When using an overridable decorator, only one is allowed`
      );
    return this.decorate(false, ...decorators);
  }

  /**
   * @description Extends existing decorators.
   * @summary Adds additional decorators to the current context.
   * @param {...DecoratorData} decorators Additional decorators to register as addons.
   * @return {DecorationBuilderBuild} Builder instance for building the decorator.
   */
  extend(...decorators: ExtendDecoratorData[]): DecorationBuilderBuild {
    if (
      decorators.find((d) => typeof d === "object") &&
      decorators.length !== 1
    )
      throw new Error(
        `When extending using an overridable decorator, only one is allowed`
      );
    return this.decorate(true, ...decorators);
  }

  /**
   * @description Factory that creates a context-aware decorator for a key/flavour.
   * @summary Produces a decorator function bound to the provided key and flavour. The resulting decorator resolves the actual decorators to apply at invocation time based on the target's resolved flavour and the registered base and extra decorators.
   * @param {string} key Decoration key used to look up registered decorators.
   * @param {string} [f=DefaultFlavour] Explicit flavour to bind the factory to.
   * @return {ClassDecorator|MethodDecorator|PropertyDecorator|ParameterDecorator} Decorator function that applies the resolved decorators.
   * @mermaid
   * sequenceDiagram
   *   participant U as User Code
   *   participant B as Decoration (builder)
   *   participant F as decoratorFactory(key, f)
   *   participant R as flavourResolver
   *   participant A as Applied Decorators
   *   U->>B: define()/extend() and apply()
   *   B->>F: create context decorator
   *   F->>R: resolve(target)
   *   R-->>F: flavour
   *   F->>A: collect base + extras
   *   loop each decorator
   *     A->>U: invoke decorator(target, key?, desc?)
   *   end
   */
  protected decoratorFactory(
    key: string,
    f?: string,
    overrides?: Record<number, any[]>
  ) {
    function contextDecorator(
      target: object,
      propertyKey?: any,
      descriptor?: TypedPropertyDescriptor<any>
    ) {
      const flavour = f ?? Decoration.flavourResolver(target);
      const cache = Decoration.decorators[key];
      let decorators;
      const extras = cache[flavour]
        ? cache[flavour].extras
        : cache[Decoration.defaultFlavour].extras;

      if (
        cache &&
        cache[flavour] &&
        cache[flavour].decorators &&
        cache[flavour].decorators.size
      ) {
        decorators = cache[flavour].decorators;
      } else {
        decorators = cache[Decoration.defaultFlavour].decorators;
      }

      const baseDecoratorsList = [...(decorators ? decorators.values() : [])];

      const defaultDecoratorsList = [
        ...(cache[Decoration.defaultFlavour]?.decorators || new Set()).values(),
      ];

      const baseArgsByIndex = baseDecoratorsList.reduce(
        (accum, entry, index) => {
          if (
            typeof entry === "object" &&
            "args" in (entry as any) &&
            Array.isArray((entry as any).args)
          ) {
            accum[index] = (entry as any).args;
          }
          return accum;
        },
        {} as Record<number, any[]>
      );

      const defaultArgsByIndex = defaultDecoratorsList.reduce(
        (accum, entry, index) => {
          if (
            typeof entry === "object" &&
            "args" in (entry as any) &&
            Array.isArray((entry as any).args)
          ) {
            accum[index] = (entry as any).args;
          }
          return accum;
        },
        {} as Record<number, any[]>
      );

      const toApply = [
        ...baseDecoratorsList,
        ...(extras ? extras.values() : []),
      ];

      const baseLength = baseDecoratorsList.length;
      const argsOverrides = overrides || {};

      let currentTarget = target;
      let currentDescriptor = descriptor;

      toApply.forEach((d, index) => {
        let decoratorFn: DecoratorTypes;
        if (typeof d === "object") {
          const entry = d as any;
          const candidateIndex = index < baseLength ? index : 0;
          const overrideArgs =
            index < baseLength ? argsOverrides[candidateIndex] : undefined;
          const args =
            overrideArgs ||
            ("args" in entry && Array.isArray(entry.args)
              ? entry.args
              : (baseArgsByIndex[candidateIndex] ??
                defaultArgsByIndex[candidateIndex] ??
                defaultArgsByIndex[0] ??
                []));
          const invocationArgs = args.map((arg: unknown) =>
            typeof arg === "object" && arg !== null
              ? cloneMetadataValue(arg)
              : arg
          );
          decoratorFn = entry.decorator(
            ...invocationArgs
          ) as DecoratorTypes;
        } else if (typeof d === "function") {
          decoratorFn = d as DecoratorTypes;
        } else {
          throw new Error(`Unexpected decorator type: ${typeof d}`);
        }

        const result = (decoratorFn as any)(
          typeof propertyKey === "undefined" ? currentTarget : target,
          propertyKey,
          currentDescriptor
        );

        if (typeof propertyKey === "undefined") {
          if (typeof result === "function") {
            currentTarget = result;
          }
        } else if (typeof result !== "undefined") {
          currentDescriptor = result;
        }
      });

      return typeof propertyKey === "undefined"
        ? currentTarget
        : currentDescriptor;
    }
    Object.defineProperty(contextDecorator, "name", {
      value: [f || "dynamic", key].join("_decorator_for_"),
      writable: false,
    });
    return contextDecorator;
  }

  /**
   * @description Creates the final decorator function.
   * @summary Builds and returns the decorator factory function.
   * @return {ClassDecorator|MethodDecorator|PropertyDecorator|ParameterDecorator} Generated decorator function ready for application.
   */
  apply(): (
    target: any,
    propertyKey?: any,
    descriptor?: TypedPropertyDescriptor<any>
  ) => any {
    if (!this.key)
      throw new Error("No key provided for the decoration builder");

    const key = this.key;

    const existingDecorators =
      Decoration.decorators[this.key]?.[this.flavour]?.decorators;
    const decoratorsToRegister =
      this.decorators || existingDecorators || new Set<DecoratorData>();

    const extrasToRegister =
      typeof this.extras !== "undefined" ? this.extras : undefined;

    Decoration.register(
      this.key,
      this.flavour,
      decoratorsToRegister,
      extrasToRegister
    );

    const wrapper = (target: any, propertyKey?: any, descriptor?: any) => {
      const isMember = typeof propertyKey !== "undefined";
      const owner =
        typeof target === "function" ? target : target?.constructor || target;
      if (owner && isMember) {
        const currentFlavour = Metadata["innerGet"](
          Metadata.Symbol(owner),
          DecorationKeys.FLAVOUR
        );
        if (!currentFlavour) uses(Decoration.defaultFlavour)(owner);
        const argsOverride = this.snapshotDecoratorArgs();
        Decoration.registerPendingDecorator(
          owner,
          target,
          (resolvedFlavour: string) => {
            return this.decoratorFactory(key, resolvedFlavour, argsOverride);
          },
          propertyKey,
          descriptor,
          argsOverride,
          key
        );
        Decoration.resolvePendingDecorators(owner);
        if (propertyKey && !descriptor) {
          prop()(owner, propertyKey); // auto tag as a property
        }
        if (propertyKey && descriptor) {
          // TODO this probably needs refining. under some compilation processes, the descriptor can exit on a prop
          method()(owner, propertyKey, descriptor); // auto tag as a method
        }
        return descriptor;
      }

      const flavourHint =
        this.flavour === Decoration.defaultFlavour ? undefined : this.flavour;
      return this.decoratorFactory(key as string, flavourHint)(
        target,
        propertyKey,
        descriptor
      );
    };

    try {
      Object.defineProperty(wrapper, "name", {
        value: [this.flavour, key].join("_decorator_for_"),
        writable: false,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e: unknown) {
      // Ignore environments that forbid redefining function name
    }

    return wrapper;
  }

  /**
   * @description Registers decorators for a specific key and flavour.
   * @summary Internal method to store decorators in the static registry.
   * @param {string} key Decorator key.
   * @param {string} flavour Decorator flavour.
   * @param {Set<DecoratorData>} [decorators] Primary decorators registered for the key.
   * @param {Set<DecoratorData>} [extras] Additional decorators registered as flavour-specific addons.
   * @return {void}
   */
  private static register(
    key: string,
    flavour: string,
    decorators?: Set<DecoratorData>,
    extras?: Set<StoredDecoratorData>
  ) {
    if (!key) {
      throw new Error("No key provided for the decoration builder");
    }
    if (!decorators)
      throw new Error("No decorators provided for the decoration builder");
    if (!flavour)
      throw new Error("No flavour provided for the decoration builder");

    if (!Decoration.decorators[key]) Decoration.decorators[key] = {};
    if (!Decoration.decorators[key][flavour])
      Decoration.decorators[key][flavour] = {};
    Decoration.decorators[key][flavour].decorators = decorators;
    if (typeof extras !== "undefined") {
      Decoration.decorators[key][flavour].extras = extras;
    }
  }

  static setResolver(resolver: FlavourResolver) {
    Decoration.flavourResolver = resolver;
  }

  private static shouldOverrideEntry(
    entry: PendingDecorator,
    flavour: string
  ): boolean {
    if (!entry.definitionKey) return false;
    if (flavour === Decoration.defaultFlavour) return false;
    const cache = Decoration.decorators[entry.definitionKey];
    if (!cache) return false;
    const flavourBucket = cache[flavour];
    if (!flavourBucket) return false;
    const defaultBucket = cache[Decoration.defaultFlavour];
    const hasDecorators =
      flavourBucket.decorators && flavourBucket.decorators.size > 0;
    const hasExtras =
      flavourBucket.extras instanceof Set &&
      flavourBucket.extras.size > 0;
    if (!hasDecorators && !hasExtras) return false;
    if (!defaultBucket) return true;
    const decoratorsMatch =
      !hasDecorators ||
      flavourBucket.decorators === defaultBucket.decorators;
    const extrasMatch =
      !hasExtras || flavourBucket.extras === defaultBucket.extras;
    return !(decoratorsMatch && extrasMatch);
  }

  /**
   * @description Convenience static entry to start a decoration builder.
   * @summary Creates a new Decoration instance and initiates the builder chain with the provided key.
   * @param {string} key Decoration key to configure.
   * @return {DecorationBuilderMid} Builder instance for chaining definitions.
   */
  static for(key: string): DecorationBuilderMid {
    return new Decoration().for(key);
  }

  /**
   * @description Starts a builder for a specific flavour.
   * @summary Convenience method to begin a Decoration builder chain bound to the given flavour identifier, allowing registration of flavour-specific decorators.
   * @param {string} flavour Flavour name to bind to the builder.
   * @return {DecorationBuilderStart} Builder start interface to continue configuration.
   */
  static flavouredAs(flavour: string): DecorationBuilderStart {
    return new Decoration(flavour);
  }
}
function revertMetadataDiff(
  owner: any,
  diff?: MetadataDiffEntry[]
): void {
  if (!diff || !diff.length) {
    return;
  }
  const metadataStore = (Metadata as any)["_metadata"] as Record<
    symbol,
    Record<string | symbol, any>
  >;
  const symbol = Metadata.Symbol(owner);
  const bucket =
    metadataStore[symbol] ||
    (metadataStore[symbol] = {} as Record<string | symbol, any>);
  diff.forEach(({ path, previousValue, existed }) => {
    if (!path.length) return;
    if (path[0] === DecorationKeys.PROPERTIES) return;
    let target: Record<string | symbol, any> = bucket;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!isPlainObject(target[key as any])) {
        target[key as any] = {};
      }
      target = target[key as any];
    }
    const key = path[path.length - 1];
    if (!existed) {
      delete target[key as any];
      pruneEmptyAncestors(bucket, path.slice(0, -1));
    } else {
      target[key as any] = cloneMetadataValue(previousValue);
    }
  });
}

function restorePropertyDescriptor(entry: PendingDecorator): void {
  if (!entry || typeof entry.propertyKey === "undefined") return;
  const target = entry.target;
  if (!target || typeof entry.descriptorWasOwn === "undefined") return;
  const propertyKey = entry.propertyKey;
  const snapshot = entry.descriptorSnapshot;
  if (entry.descriptorWasOwn) {
    if (snapshot) {
      Object.defineProperty(target, propertyKey, snapshot);
    } else {
      delete (target as Record<string | symbol, any>)[propertyKey as any];
    }
  } else {
    delete (target as Record<string | symbol, any>)[propertyKey as any];
    if (snapshot) {
      Object.defineProperty(target, propertyKey, snapshot);
    }
  }
}
