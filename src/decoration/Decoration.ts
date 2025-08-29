import {
  DecorationBuilderBuild,
  DecorationBuilderEnd,
  DecorationBuilderMid,
  DecorationBuilderStart,
  FlavourResolver,
  IDecorationBuilder,
} from "./types";
import { DefaultFlavour } from "./constants";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function defaultFlavourResolver(target: object) {
  return DefaultFlavour;
}

export type DecoratorTypes =
  | ClassDecorator
  | PropertyDecorator
  | MethodDecorator;

export type DecoratorFactory = (...args: any[]) => DecoratorTypes;

export type DecoratorFactoryArgs = {
  decorator: DecoratorFactory;
  args?: any[];
};

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
 * @category Model
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
    return this.decorate(false, ...decorators);
  }

  /**
   * @description Extends existing decorators
   * @summary Adds additional decorators to the current context
   * @param decorators Additional decorators
   * @return {DecorationBuilderBuild} Builder instance for building the decorator
   */
  extend(...decorators: DecoratorData[]): DecorationBuilderBuild {
    return this.decorate(true, ...decorators);
  }

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
      const extraArgs = [
        ...((cache[DefaultFlavour] as any).extras
          ? (cache[DefaultFlavour] as any).extras.values()
          : []),
      ].reduce((accum: Record<number, any>, e, i) => {
        if (e.args) accum[i] = e.args;
        return accum;
      }, {});

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
              const { decorator, args } = d as DecoratorFactoryArgs;
              const argz =
                args || i < (decorators ? decorators.size : 0)
                  ? decoratorArgs[i]
                  : extraArgs[i - (decorators ? decorators.size : 0)] ||
                    (decorators ? decoratorArgs[i - decorators.size] : []);

              return (decorator(...(argz || [])) as any)(
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

  static for(key: string): DecorationBuilderMid {
    return new Decoration().for(key);
  }

  static flavouredAs(flavour: string): DecorationBuilderStart {
    return new Decoration(flavour);
  }
}
