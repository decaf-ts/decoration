import { Metadata } from "./metadata/Metadata";
import { DecorationKeys, DecorationState, DefaultFlavour } from "./constants";
import { Decoration } from "./decoration/Decoration";

/**
 * @description Assigns arbitrary metadata to a target using a string key.
 * @summary Decorator factory that stores a key/value pair in the central metadata store for the provided class or member.
 * @param {string} key Metadata key to associate with the target.
 * @param {any} value Metadata value to store under the given key.
 * @return {ClassDecorator|MethodDecorator|PropertyDecorator|ParameterDecorator} Decorator that writes the metadata when applied.
 * @function metadata
 * @category Decorators
 */
export function metadata(key: string, value: any) {
  return function metadata(
    model: any,
    prop?: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    descriptor?: PropertyDescriptor | number
  ) {
    Metadata.set(prop ? model.constructor : model, key, value);
  };
}

export function metadataArray(key: string, ...data: any[]) {
  return function metadataArray(
    target: any,
    propertyKey?: any,
    descriptor?: any
  ) {
    const existingData = Metadata.get(target, key) || [];
    const metaKey = propertyKey ? Metadata.key(key, propertyKey) : key;
    const arr = [metadata(metaKey, [...new Set([...existingData, ...data])])];
    return apply(...arr)(target, propertyKey, descriptor);
  };
}

export function uses(flavour: string) {
  return (object: any) => {
    Metadata.set(object, DecorationKeys.FLAVOUR, flavour);
    // const meta = Metadata.get(object, DecorationKeys.FLAVOUR);
    if (flavour !== DefaultFlavour) {
      Decoration["resolvePendingDecorators"](object, flavour);
    } else {
      Metadata.set(object, DecorationKeys.DECORATION, DecorationState.PENDING);
    }
    return object;
  };
}

/**
 * @description Captures and stores a property's design type.
 * @summary Decorator factory that reads the reflected `design:type` for a property and registers it in the metadata store under the properties map.
 * @return {PropertyDecorator} Decorator that records the property's type metadata when applied.
 * @function prop
 * @category Property Decorators
 */
export function prop() {
  function innerProp() {
    return function innerProp(model: object, prop?: any) {
      const designType = Reflect.getOwnMetadata(
        DecorationKeys.DESIGN_TYPE,
        model,
        prop
      );
      return metadata(
        Metadata.key(DecorationKeys.PROPERTIES, prop),
        designType
      )(model, prop);
    };
  }

  return Decoration.for(DecorationKeys.PROPERTIES)
    .define({
      decorator: innerProp,
      args: [],
    })
    .apply();
}

/**
 * @description Captures a single parameter type for the decorated method.
 * @summary Decorator factory that ensures the method metadata is initialised and stores the reflected parameter constructor at the provided index.
 * @return {ParameterDecorator} Decorator that records the parameter type when applied.
 * @function param
 * @category Parameter Decorators
 * @mermaid
 * sequenceDiagram
 *   participant U as User Code
 *   participant P as param()
 *   participant M as Metadata
 *   U->>P: param()(target, key, index)
 *   P->>U: method()(target, key, descriptor)
 *   P->>M: params(constructor, key)
 *   M-->>P: parameter constructors[]
 *   P->>M: set(methods.key.index, constructor)
 *   P-->>U: parameter recorded
 */
export function param() {
  return function param(model: object, prop?: any, index?: number) {
    if (!prop)
      throw new Error(`The @param decorator can only be applied to methods`);
    method()(model, prop, Object.getOwnPropertyDescriptor(model, prop));
    const paramTpes = Metadata.params(model.constructor as any, prop as string);
    if (!paramTpes)
      throw new Error(`Missing parameter types for ${String(prop)}`);
    if ((index as number) >= paramTpes.length)
      throw new Error(
        `Parameter index ${index} out of range for ${String(prop)}`
      );
    metadata(
      Metadata.key(
        DecorationKeys.METHODS,
        prop as string,
        (index as number).toString()
      ),
      paramTpes[index as number]
    )(model, prop);
  };
}

/**
 * @description Extends a parameter decorator with additional metadata.
 * @summary Applies the default `param()` decorator and augments the stored metadata with an arbitrary key/value pair.
 * @param {string} key Metadata key to associate with the parameter.
 * @param {any} value Metadata value persisted under the given key.
 * @return {ParameterDecorator} Decorator that records both the parameter design type and additional metadata.
 * @function paramMetadata
 * @category Parameter Decorators
 */
export function paramMetadata(key: string, value: any) {
  return function paramMetadata(target: any, prop: any, index: number) {
    return apply(
      param(),
      metadata(Metadata.key(DecorationKeys.METHODS, prop, key), value)
    )(target, prop, index);
  };
}

/**
 * @description Records method design-time metadata.
 * @summary Decorator factory that captures a method's reflected parameter and return types, storing them under the appropriate metadata keys so they can be inspected at runtime.
 * @return {MethodDecorator} Decorator that persists the method's signature information into the metadata store when applied.
 * @function method
 * @mermaid
 * sequenceDiagram
 *   participant U as User Code
 *   participant F as method()
 *   participant M as Metadata
 *   U->>F: method()(target, key, descriptor)
 *   F->>U: Reflect.getOwnMetadata(design:paramtypes)
 *   F->>U: Reflect.getOwnMetadata(design:returntype)
 *   F->>M: set(methods.key.design:paramtypes, params)
 *   F->>M: set(methods.key.design:returntype, returnType)
 *   F-->>U: decorated function
 * @category Method Decorators
 */
export function method() {
  return function method(obj: any, prop?: any, descriptor?: any) {
    const designParams = Reflect.getOwnMetadata(
      DecorationKeys.DESIGN_PARAMS,
      obj,
      prop
    );
    const designReturn = Reflect.getOwnMetadata(
      DecorationKeys.DESIGN_RETURN,
      obj,
      prop
    );
    return apply(
      metadata(
        Metadata.key(
          DecorationKeys.METHODS,
          prop,
          DecorationKeys.DESIGN_PARAMS
        ),
        designParams
      ),
      metadata(
        Metadata.key(
          DecorationKeys.METHODS,
          prop,
          DecorationKeys.DESIGN_RETURN
        ),
        designReturn
      )
    )(obj, prop, descriptor);
  };
}

/**
 * @description Decorator factory that applies multiple decorators to a single target.
 * @summary Creates a composite decorator that applies multiple decorators in sequence, correctly handling class, method, property, and parameter decorators.
 * @param {Array<ClassDecorator|MethodDecorator|PropertyDecorator|ParameterDecorator>} decorators Collection of decorators to apply.
 * @return {ClassDecorator|MethodDecorator|PropertyDecorator|ParameterDecorator} Decorator function that applies all provided decorators to the target.
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
  ...decorators: Array<
    ClassDecorator | MethodDecorator | PropertyDecorator | ParameterDecorator
  >
) {
  return (
    target: object,
    propertyKey?: string | symbol | unknown,
    descriptor?: PropertyDescriptor | number
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
 * @description Creates a property metadata decorator.
 * @summary Convenience factory that combines `metadata(key, value)` and `prop()` to both set an arbitrary metadata key and record the property's design type.
 * @param {string} key Metadata key to set for the property.
 * @param {any} value Metadata value to associate with the key.
 * @return {PropertyDecorator} Decorator that sets the metadata and captures the property's type.
 * @function propMetadata
 * @category Property Decorators
 */
export function propMetadata(key: string, value: any) {
  return apply(metadata(key, value), prop());
}

/**
 * @description Creates a method metadata decorator.
 * @summary Convenience factory that combines `metadata(key, value)` and `method()` to both set an arbitrary metadata key and record the method's design return and param types.
 * @param {string} key Metadata key to set for the property.
 * @param {any} value Metadata value to associate with the key.
 * @return {MethodDecorator} Decorator that sets the metadata and captures the method's signature metadata.
 * @function methodMetadata
 * @category Method Decorators
 */
export function methodMetadata(key: string, value: any) {
  return apply(metadata(key, value), method());
}

/**
 * @description Attaches a human-readable description to a class or member.
 * @summary Decorator factory that stores a textual description in the metadata store under the appropriate description key for a class or its property.
 * @param {string} desc Descriptive text to associate with the class or property.
 * @return {ClassDecorator|MethodDecorator|PropertyDecorator} Decorator that records the description when applied.
 * @function description
 * @category Decorators
 */

export function description(desc: string) {
  function innerDescription(desc: string) {
    return function innerDescription(
      original: any,
      prop?: any,
      descriptor?: any
    ) {
      return metadata(
        Metadata.key(
          DecorationKeys.DESCRIPTION,
          prop ? prop.toString() : DecorationKeys.CLASS
        ),
        desc
      )(original, prop, descriptor);
    };
  }

  return Decoration.for(DecorationKeys.DESCRIPTION)
    .define({
      decorator: innerDescription,
      args: [desc],
    })
    .apply();
}
