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
import { uses } from "../decorators";

/**
 * @description Default resolver that returns the current default flavour.
 * @summary Resolves the flavour for a given target by always returning the library's `DefaultFlavour` value.
 * @param {object} target Target object being decorated.
 * @return {string} Resolved flavour identifier.
 * @function flavourResolver
 * @memberOf module:decoration
 */
function flavourResolver(target: object): string {
  const owner =
    typeof target === "function" ? target : (target as any)?.constructor;
  const meta = Metadata.get((owner || target) as any, DecorationKeys.FLAVOUR);
  return meta ?? DefaultFlavour;
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
  key: string; // unique identifier
}

interface TargetDecorationState {
  pending: PendingDecorator[];
  flavour?: string;
  directApply?: boolean;
  resolved?: boolean;
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

  constructor(private flavour: string = DefaultFlavour) {}

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
    try {
      entry.callback(flavour, entry.argsOverride)(
        entry.target,
        entry.propertyKey as string | symbol,
        entry.descriptor as TypedPropertyDescriptor<any>
      );
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
    if (!state.flavour) state.flavour = DefaultFlavour;
    Metadata.set(owner, DecorationKeys.DECORATION, DecorationState.PENDING);
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
    argsOverride?: Record<number, any[]>
  ): string {
    const key = `${
      owner?.name || "anonymous"
    }:${String(propertyKey || "class")}:${Date.now()}:${Math.random()}`;

    const state = this.getTargetState(owner);
    const entry: PendingDecorator = {
      owner,
      target,
      propertyKey,
      descriptor,
      callback,
      argsOverride,
      key,
    };

    if (state.directApply) {
      const flavourToUse =
        state.flavour ||
        Metadata.get(owner, DecorationKeys.FLAVOUR) ||
        DefaultFlavour;
      this.applyPendingEntry(entry, flavourToUse);
      state.flavour = flavourToUse;
      Metadata.set(owner, DecorationKeys.DECORATION, true);
      return key;
    }

    state.pending.push(entry);

    if (Decoration.flavourResolver !== flavourResolver) {
      try {
        const eagerFlavour = Decoration.flavourResolver(owner);
        if (eagerFlavour && eagerFlavour !== DefaultFlavour) {
          this.resolvePendingDecorators(owner, eagerFlavour);
        }
      } catch {
        // Ignore resolver errors during eager resolution attempts.
      }
    }

    return key;
  }

  private static ensureLazyResolution(
    owner: any,
    target: any,
    propertyKey?: string | symbol
  ): void {
    if (!owner || typeof propertyKey === "undefined") return;
    const definitionTarget =
      typeof target === "function" ? target.prototype : target;
    if (!definitionTarget) return;

    const descriptor = Object.getOwnPropertyDescriptor(
      definitionTarget,
      propertyKey
    );

    // Skip if another decorator already installed a non-configurable descriptor.
    if (descriptor && descriptor.configurable === false) return;

    const placeholderGet = function (this: any) {
      Decoration.resolvePendingDecorators(owner);
      const resolved = Object.getOwnPropertyDescriptor(
        definitionTarget,
        propertyKey
      );
      if (resolved?.get && resolved.get !== placeholderGet) {
        return resolved.get.call(this);
      }
      if (resolved && "value" in resolved) {
        return resolved.value;
      }
      return undefined;
    };

    const placeholderSet = function (this: any, value: any) {
      Decoration.resolvePendingDecorators(owner);
      const resolved = Object.getOwnPropertyDescriptor(
        definitionTarget,
        propertyKey
      );
      if (resolved?.set && resolved.set !== placeholderSet) {
        resolved.set.call(this, value);
        return;
      }
      Object.defineProperty(this, propertyKey, {
        configurable: true,
        writable: true,
        value,
      });
    };

    Object.defineProperty(placeholderGet, "__decafLazy", {
      value: true,
      enumerable: false,
    });
    Object.defineProperty(placeholderSet, "__decafLazy", {
      value: true,
      enumerable: false,
    });

    Object.defineProperty(definitionTarget, propertyKey, {
      configurable: true,
      enumerable: descriptor?.enumerable ?? true,
      get: placeholderGet,
      set: placeholderSet,
    });
  }

  protected static resolvePendingDecorators(
    target: any,
    flavour?: string
  ): void {
    const owner =
      typeof target === "function" ? target : target?.constructor || target;
    if (!owner) return;

    const state = this.getTargetState(owner);
    if (!state.pending.length && !flavour) {
      return;
    }

    const resolvedFlavour =
      flavour ||
      state.flavour ||
      Metadata.get(owner, DecorationKeys.FLAVOUR) ||
      DefaultFlavour;

    while (state.pending.length) {
      const entry = state.pending.shift();
      if (!entry) continue;
      this.applyPendingEntry(entry, resolvedFlavour);
    }

    state.flavour = resolvedFlavour;
    state.resolved = true;
    if (resolvedFlavour !== DefaultFlavour) {
      state.directApply = true;
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
      this.flavour !== DefaultFlavour
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

  private snapshotDecoratorArgs():
    | Record<number, any[]>
    | undefined {
    if (!this.decorators || !this.decorators.size) return undefined;
    const overrides: Record<number, any[]> = {};
    Array.from(this.decorators.values()).forEach((entry, index) => {
      if (
        typeof entry === "object" &&
        "args" in entry &&
        Array.isArray(entry.args)
      ) {
        overrides[index] = [...entry.args];
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
        : cache[DefaultFlavour].extras;

      if (
        cache &&
        cache[flavour] &&
        cache[flavour].decorators &&
        cache[flavour].decorators.size
      ) {
        decorators = cache[flavour].decorators;
      } else {
        decorators = cache[DefaultFlavour].decorators;
      }

      const baseDecoratorsList = [...(decorators ? decorators.values() : [])];

      const defaultDecoratorsList = [
        ...(cache[DefaultFlavour]?.decorators || new Set()).values(),
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

      return toApply.reduce(
        (_, d, index) => {
          switch (typeof d) {
            case "object": {
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

              return (entry.decorator(...args) as any)(
                target,
                propertyKey,
                descriptor
              );
            }
            case "function":
              return (d as any)(target, propertyKey, descriptor);
            default:
              throw new Error(`Unexpected decorator type: ${typeof d}`);
          }
        },
        { target, propertyKey, descriptor }
      );
    }
    Object.defineProperty(contextDecorator, "name", {
      value: [(f || "dynamic"), key].join("_decorator_for_"),
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
        uses(DefaultFlavour)(owner);
        const argsOverride = this.snapshotDecoratorArgs();
        Decoration.registerPendingDecorator(
          owner,
          target,
          (resolvedFlavour: string) => {
            return this.decoratorFactory(key, resolvedFlavour, argsOverride);
          },
          propertyKey,
          descriptor,
          argsOverride
        );
        Decoration.ensureLazyResolution(owner, target, propertyKey);
        return descriptor;
      }

      const flavourHint =
        this.flavour === DefaultFlavour ? undefined : this.flavour;
      return this.decoratorFactory(key as string, flavourHint)(
        target,
        propertyKey,
        descriptor
      );
    };

    // Give the wrapper a readable name so tests (and debuggers) can inspect it.
    try {
      Object.defineProperty(wrapper, "name", {
        value: [this.flavour, key].join("_decorator_for_"),
        writable: false,
      });
    } catch (e) {
      console.error(e);
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
