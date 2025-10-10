import { DecoratorData } from "./Decoration";

/**
 * @description Interface for the final stage of the decoration builder pattern.
 * @summary Represents the build stage of the decoration builder, providing the ability to apply the configured decorator to a target. This is the final stage in the builder chain.
 * @interface DecorationBuilderBuild
 * @memberOf module:decoration
 */
export interface DecorationBuilderBuild {
  /**
   * @description Creates and returns the decorator function.
   * @summary Finalises the builder process and returns a decorator function that can be applied to a class, property, or method.
   * @return {function(any, any, TypedPropertyDescriptor<any>):ClassDecorator|MethodDecorator|PropertyDecorator|ParameterDecorator} Decorator function that can be applied to a target.
   */
  apply(): (
    target: any,
    propertyKey?: any,
    descriptor?: TypedPropertyDescriptor<any>
  ) => any;
}

/**
 * @description Interface for the extension stage of the decoration builder pattern.
 * @summary Represents the extension stage of the decoration builder, providing the ability to add additional decorators to the existing configuration.
 * @interface DecorationBuilderEnd
 * @memberOf module:decoration
 */
export interface DecorationBuilderEnd {
  /**
   * @description Adds additional decorators to the existing configuration.
   * @summary Extends the current decorator configuration with additional decorators, making it useful for augmenting previously defined behaviour.
   * @param {...DecoratorData} decorators Additional decorators to add.
   * @return {DecorationBuilderBuild} The build stage of the builder pattern.
   */
  extend(...decorators: DecoratorData[]): DecorationBuilderBuild;
}

/**
 * @description Interface for the middle stage of the decoration builder pattern.
 * @summary Represents the middle stage of the decoration builder, extending the end stage and providing the ability to define the primary decorators for the configuration.
 * @interface DecorationBuilderMid
 * @memberOf module:decoration
 */
export interface DecorationBuilderMid extends DecorationBuilderEnd {
  /**
   * @description Defines the primary decorators for the configuration.
   * @summary Sets the main decorators for the current context after specifying the key with the `for` method.
   * @param {...DecoratorData} decorators Decorators to define for the current key and flavour.
   * @return {DecorationBuilderEnd} Interface representing the remaining builder stages (also implements DecorationBuilderBuild).
   */
  define(
    ...decorators: DecoratorData[]
  ): DecorationBuilderEnd & DecorationBuilderBuild;
}

/**
 * @description Interface for the starting stage of the decoration builder pattern.
 * @summary Represents the initial stage of the decoration builder, providing the entry point for the builder pattern by specifying the key for the decorator.
 * @interface DecorationBuilderStart
 * @memberOf module:decoration
 */
export interface DecorationBuilderStart {
  /**
   * @description Specifies the key for the decorator.
   * @summary Sets the identifier for the decorator, which is used to register and retrieve the decorator in the decoration registry.
   * @param {string} id Identifier for the decorator.
   * @return {DecorationBuilderMid} The middle stage of the builder pattern.
   */
  for(id: string): DecorationBuilderMid;
}

/**
 * @description Comprehensive interface for the complete decoration builder pattern.
 * @summary Unified interface that combines all stages of the decoration builder pattern, providing a complete API for creating, configuring, and applying decorators. This interface is implemented by the Decoration class.
 * @interface IDecorationBuilder
 * @memberOf module:decoration
 */
export interface IDecorationBuilder
  extends DecorationBuilderStart,
    DecorationBuilderMid,
    DecorationBuilderEnd,
    DecorationBuilderBuild {}

/**
 * @description Type definition for a function that resolves the flavour for a target.
 * @summary Defines a function type that determines the appropriate flavour for a given target object, enabling flavour-aware decorator selection.
 * @param {object} target Target object to resolve the flavour for.
 * @return {string} Resolved flavour identifier.
 * @typeDef FlavourResolver
 * @memberOf module:decoration
 */
export type FlavourResolver = (target: object) => string;
