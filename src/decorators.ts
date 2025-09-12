import { Metadata } from "./metadata/Metadata";
import { DecorationKeys, ObjectKeySplitter } from "./constants";

/**
 * @description Assigns arbitrary metadata to a target using a string key
 * @summary Decorator factory that stores a key/value pair in the central Metadata store for the provided class or member.
 * @param {string} key The metadata key to associate with the target
 * @param {*} value The metadata value to store under the given key
 * @return A decorator that writes the metadata when applied
 * @function metadata
 * @category Decorators
 */
export function metadata(key: string, value: any) {
  return function metadata(
    model: any,

    prop?: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    descriptor?: PropertyDescriptor
  ) {
    Metadata.set(prop ? model.constructor : model, key, value);
  };
}

/**
 * @description Captures and stores a property's design type
 * @summary Decorator factory that reads the reflected design:type for a property and registers it in the Metadata store under the properties map.
 * @return A decorator that records the property's type metadata when applied
 * @function prop
 * @category Decorators
 */
export function prop() {
  return function prop(model: object, prop: any) {
    const designType = Reflect.getOwnMetadata(
      DecorationKeys.DESIGN_TYPE,
      model,
      prop
    );
    return metadata(`${DecorationKeys.PROPERTIES}.${prop}`, designType)(
      model,
      prop
    );
  };
}

/**
 * @description Decorator factory that applies multiple decorators to a single target
 * @summary Creates a composite decorator that applies multiple decorators in sequence, correctly handling class, method, and property decorators.
 * @param {Array<ClassDecorator | MethodDecorator | PropertyDecorator>} decorators - Array of decorators to apply
 * @return {Function} A decorator function that applies all provided decorators to the target
 * @function apply
 * @mermaid
 * sequenceDiagram
 *   participant U as User Code
 *   participant A as apply(...decorators)
 *   participant D as Decorator
 *   U->>A: get decorator(...decorators)
 *   A->>U: returns (target, key?, desc?) => void
 *   U->>A: invoke on target
 *   loop for each decorator
 *     A->>D: invoke appropriate decorator type
 *   end
 * @category Decorators
 */
export function apply(
  ...decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator>
) {
  return (
    target: object,
    propertyKey?: string | symbol | unknown,
    descriptor?: PropertyDescriptor
  ) => {
    for (const decorator of decorators) {
      if (target instanceof Function && !descriptor) {
        (decorator as ClassDecorator)(target);
        continue;
      }
      (decorator as MethodDecorator | PropertyDecorator)(
        target,
        propertyKey as string | symbol,
        descriptor as TypedPropertyDescriptor<unknown>
      );
    }
  };
}

/**
 * @description Creates a property metadata decorator
 * @summary Convenience factory that combines metadata(key, value) and prop() to both set an arbitrary metadata key and record the property's design type.
 * @param {string} key The metadata key to set for the property
 * @param {*} value The metadata value to associate with the key
 * @return A decorator that sets the metadata and captures the property's type
 * @function propMetadata
 * @category Decorators
 */
export function propMetadata(key: string, value: any) {
  return apply(metadata(key, value), prop());
}

/**
 * @description Attaches a human-readable description to a class or member
 * @summary Decorator factory that stores a textual description in the Metadata store under the appropriate description key for a class or its property.
 * @param {string} desc The descriptive text to associate with the class or property
 * @return A decorator that records the description when applied
 * @function description
 * @category Decorators
 */
export function description(desc: string) {
  return function description(original: any, prop: any, descriptor?: any) {
    return metadata(
      [
        DecorationKeys.DESCRIPTION,
        prop ? prop.toString() : DecorationKeys.CLASS,
      ].join(ObjectKeySplitter),
      desc
    )(original, prop, descriptor);
  };
}
