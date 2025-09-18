import {
  DecorationBuilderBuild,
  DecorationBuilderEnd,
  DecorationBuilderMid,
  DecorationBuilderStart,
  FlavourResolver,
  IDecorationBuilder,
} from "./types";
import { DefaultFlavour } from "../constants";

/**
 * @description Default resolver that returns the current default flavour
 * @summary Resolves the flavour for a given target by always returning the library's DefaultFlavour value.
 * @param {object} target The target object being decorated
 * @return {string} The resolved flavour identifier
 * @function defaultFlavourResolver
 * @memberOf module:decoration
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function defaultFlavourResolver(target: object) {
  return DefaultFlavour;
}

/**
 * @description Union type covering supported decorator kinds
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
 * @description Type definition for a decorator factory function
 * @summary Represents a function that accepts arbitrary arguments and returns a concrete decorator function to be applied to a target.
 * @template A
 * @typeDef DecoratorFactory
 * @memberOf module:decoration
 */
export type DecoratorFactory = (...args: any[]) => DecoratorTypes;

/**
 * @description Argument bundle for a decorator factory
 * @summary Object form used to defer decorator creation, carrying both the factory function and its argument list to be invoked later during application.
 * @typeDef DecoratorFactoryArgs
 * @property {DecoratorFactory} decorator The factory function that produces a decorator when invoked
 * @property {any[]} [args] Optional list of arguments to pass to the decorator factory
 * @memberOf module:decoration
 */
export type DecoratorFactoryArgs = {
  decorator: DecoratorFactory;
  args?: any[];
};

/**
 * @description Union that represents either a ready-to-apply decorator or a factory with arguments
 * @summary Allows registering decorators in two forms: as direct decorator functions or as deferred factories paired with their argument lists for later instantiation.
 * @typeDef DecoratorData
 * @memberOf module:decoration
 */
export type DecoratorData = DecoratorTypes | DecoratorFactoryArgs;
/**
 * @description A decorator management class that handles flavoured decorators
 * @summary The Decoration class provides a builder pattern for creating and managing decorators with different flavours.
 * It supports registering, extending, and applying decorators with context-aware flavour resolution.
 * The class implements a fluent interface for defining, extending, and applying decorators with different flavours,
 * allowing for framework-specific decorator implementations while maintaining a consistent API.
 * @template T Type of the decorator (ClassDecorator | PropertyDecorator | MethodDecorator)
 * @param {string} [flavour] Optional flavour parameter for the decorator context
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
  /**
   * @description Static map of registered decorators
   * @summary Stores all registered decorators organized by key and flavour
   */
  private static decorators: Record<
    string,
    Record<
      string,
      {
        decorators?: Set<DecoratorData>;
        extras?: Set<DecoratorData>;
      }
    >
  > = {};

  /**
   * @description Function to resolve flavour from a target
   * @summary Resolver function that determines the appropriate flavour for a given target
   */
  private static flavourResolver: FlavourResolver = defaultFlavourResolver;

  /**
   * @description Set of decorators for the current context
   */
  private decorators?: Set<DecoratorData>;

  /**
   * @description Set of additional decorators
   */
  private extras?: Set<DecoratorData>;

  /**
   * @description Current decorator key
   */
  private key?: string;

  constructor(private flavour: string = DefaultFlavour) {}

  /**
   * @description Sets the key for the decoration builder
   * @summary Initializes a new decoration chain with the specified key
   * @param {string} key The identifier for the decorator
   * @return {DecorationBuilderMid} Builder instance for method chaining
   */
  for(key: string): DecorationBuilderMid {
    this.key = key;
    return this;
  }

  /**
   * @description Adds decorators to the current context
   * @summary Internal method to add decorators with addon support
   * @param {boolean} [addon=false] Whether the decorators are addons
   * @param decorators Array of decorators
   * @return {this} Current instance for chaining
   */
  private decorate(
    addon: boolean = false,
    ...decorators: DecoratorData[]
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
    if (this.flavour === DefaultFlavour && addon)
      throw new Error("Default flavour cannot be extended");

    this[addon ? "extras" : "decorators"] = new Set([
      ...(this[addon ? "extras" : "decorators"] || new Set()).values(),
      ...decorators,
    ]);

    return this;
  }

  /**
   * @description Defines the base decorators
   * @summary Sets the primary decorators for the current context
   * @param decorators Decorators to define
   * @return Builder instance for finishing the chain
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
   * @description Extends existing decorators
   * @summary Adds additional decorators to the current context
   * @param decorators Additional decorators
   * @return {DecorationBuilderBuild} Builder instance for building the decorator
   */
  extend(...decorators: DecoratorData[]): DecorationBuilderBuild {
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
   * @description Factory that creates a context-aware decorator for a key/flavour
   * @summary Produces a decorator function bound to the provided key and flavour. The resulting decorator resolves the actual
   * decorators to apply at invocation time based on the target's resolved flavour and the registered base and extra decorators.
   * @param {string} key The decoration key used to look up registered decorators
   * @param {string} [f=DefaultFlavour] Optional explicit flavour to bind the factory to
   * @return {function(object, any, TypedPropertyDescriptor<any>): any} A decorator function that applies the resolved decorators
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
  protected decoratorFactory(key: string, f: string = DefaultFlavour) {
    function contextDecorator(
      target: object,
      propertyKey?: any,
      descriptor?: TypedPropertyDescriptor<any>
    ) {
      const flavour = Decoration.flavourResolver(target);
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

      const decoratorArgs = [
        ...(cache[DefaultFlavour] as any).decorators.values(),
      ].reduce((accum: Record<number, any>, e, i) => {
        if (e.args) accum[i] = e.args;
        return accum;
      }, {});

      const toApply = [
        ...(decorators ? decorators.values() : []),
        ...(extras ? extras.values() : []),
      ];

      return toApply.reduce(
        (_, d, i) => {
          switch (typeof d) {
            case "object": {
              const { decorator } = d as DecoratorFactoryArgs;

              return (
                decorator(...(Object.values(decoratorArgs)[0] || [])) as any
              )(target, propertyKey, descriptor);
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
      value: [f, key].join("_decorator_for_"),
      writable: false,
    });
    return contextDecorator;
  }

  /**
   * @description Creates the final decorator function
   * @summary Builds and returns the decorator factory function
   * @return {function(any, any?, TypedPropertyDescriptor?): any} The generated decorator function
   */
  apply(): (
    target: any,
    propertyKey?: any,
    descriptor?: TypedPropertyDescriptor<any>
  ) => any {
    if (!this.key)
      throw new Error("No key provided for the decoration builder");
    Decoration.register(
      this.key,
      this.flavour,
      this.decorators || new Set(),
      this.extras
    );
    return this.decoratorFactory(this.key, this.flavour);
  }

  /**
   * @description Registers decorators for a specific key and flavour
   * @summary Internal method to store decorators in the static registry
   * @param {string} key Decorator key
   * @param {string} flavour Decorator flavour
   * @param [decorators] Primary decorators
   * @param [extras] Additional decorators
   */
  private static register(
    key: string,
    flavour: string,
    decorators?: Set<DecoratorData>,
    extras?: Set<DecoratorData>
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
    if (decorators) Decoration.decorators[key][flavour].decorators = decorators;
    if (extras) Decoration.decorators[key][flavour].extras = extras;
  }

  /**
   * @description Sets the global flavour resolver
   * @summary Configures the function used to determine decorator flavours
   * @param {FlavourResolver} resolver Function to resolve flavours
   */
  static setFlavourResolver(resolver: FlavourResolver) {
    Decoration.flavourResolver = resolver;
  }

  /**
   * @description Convenience static entry to start a decoration builder
   * @summary Creates a new Decoration instance and initiates the builder chain with the provided key.
   * @param {string} key The decoration key to configure
   * @return {DecorationBuilderMid} A builder instance for chaining definitions
   */
  static for(key: string): DecorationBuilderMid {
    return new Decoration().for(key);
  }

  /**
   * @description Starts a builder for a specific flavour
   * @summary Convenience method to begin a Decoration builder chain bound to the given flavour identifier, allowing registration of flavour-specific decorators.
   * @param {string} flavour The flavour name to bind to the builder
   * @return {DecorationBuilderStart} A builder start interface to continue configuration
   */
  static flavouredAs(flavour: string): DecorationBuilderStart {
    return new Decoration(flavour);
  }
}
