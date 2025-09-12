import { DecoratorData } from "./Decoration";

/**
 * @description Interface for the final stage of the decoration builder pattern
 * @summary Represents the build stage of the decoration builder, providing the ability to apply
 * the configured decorator to a target. This is the final stage in the builder chain.
 *
 * @interface DecorationBuilderBuild
 * @memberOf module:decoration
 * @category Model
 */
export interface DecorationBuilderBuild {
  /**
   * @description Creates and returns the decorator function
   * @summary Finalizes the builder process and returns a decorator function that can be applied to a class,
   * property, or method.
   *
   * @returns {function} A decorator function that can be applied to a target
   */
  apply(): (
    target: any,
    propertyKey?: any,
    descriptor?: TypedPropertyDescriptor<any>
  ) => any;
}

/**
 * @description Interface for the extension stage of the decoration builder pattern
 * @summary Represents the extension stage of the decoration builder, providing the ability to add
 * additional decorators to the existing configuration.
 *
 * @interface DecorationBuilderEnd
 * @memberOf module:decoration
 * @category Model
 */
export interface DecorationBuilderEnd {
  /**
   * @description Adds additional decorators to the existing configuration
   * @summary Extends the current decorator configuration with additional decorators.
   * This is useful for adding behavior to existing decorators.
   *
   * @param {...(ClassDecorator|PropertyDecorator|MethodDecorator)} decorators - Additional decorators to add
   * @returns {DecorationBuilderBuild} The build stage of the builder pattern
   */
  extend(...decorators: DecoratorData[]): DecorationBuilderBuild;
}

/**
 * @description Interface for the middle stage of the decoration builder pattern
 * @summary Represents the middle stage of the decoration builder, extending the end stage
 * and providing the ability to define the primary decorators for the configuration.
 *
 * @interface DecorationBuilderMid
 * @memberOf module:decoration
 * @category Model
 */
export interface DecorationBuilderMid extends DecorationBuilderEnd {
  /**
   * @description Defines the primary decorators for the configuration
   * @summary Sets the main decorators for the current context. This is typically
   * called after specifying the key with the 'for' method.
   */
  define(
    ...decorators: DecoratorData[]
  ): DecorationBuilderEnd & DecorationBuilderBuild;
}

/**
 * @description Interface for the starting stage of the decoration builder pattern
 * @summary Represents the initial stage of the decoration builder, providing the entry point
 * for the builder pattern by specifying the key for the decorator.
 *
 * @interface DecorationBuilderStart
 * @memberOf module:decoration
 * @category Model
 */
export interface DecorationBuilderStart {
  /**
   * @description Specifies the key for the decorator
   * @summary Sets the identifier for the decorator, which is used to register and retrieve
   * the decorator in the decoration registry.
   *
   * @param {string} id - The identifier for the decorator
   * @return {DecorationBuilderMid} The middle stage of the builder pattern
   */
  for(id: string): DecorationBuilderMid;
}

/**
 * @description Comprehensive interface for the complete decoration builder pattern
 * @summary A unified interface that combines all stages of the decoration builder pattern,
 * providing a complete API for creating, configuring, and applying decorators.
 * This interface is implemented by the Decoration class.
 *
 * @interface IDecorationBuilder
 * @memberOf module:decoration
 * @category Model
 */
export interface IDecorationBuilder
  extends DecorationBuilderStart,
    DecorationBuilderMid,
    DecorationBuilderEnd,
    DecorationBuilderBuild {}

/**
 * @description Type definition for a function that resolves the flavour for a target
 * @summary Defines a function type that determines the appropriate flavour for a given target object.
 * This is used by the Decoration class to resolve which flavour of decorator to apply based on the target.
 *
 * @typedef {function(object): string} FlavourResolver
 *
 * @param {object} target - The target object to resolve the flavour for
 * @return {string} The resolved flavour identifier
 * @memberOf module:decoration
 * @category Model
 */
export type FlavourResolver = (target: object) => string;
