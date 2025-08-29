import { Metadata } from "./metadata/Metadata";
import { DecorationKeys } from "./constants";

export function metadata(key: string, value: any) {
  return function assign(
    model: object,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    prop?: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    descriptor?: PropertyDescriptor
  ) {
    Metadata.set(model as any, key, value);
  };
}

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
 * @summary Creates a composite decorator that applies multiple decorators in sequence
 * @param {Array<ClassDecorator | MethodDecorator | PropertyDecorator>} decorators - Array of decorators to apply
 * @return {Function} A decorator function that applies all provided decorators to the target
 * @function apply
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

export function propMetadata(key: string, value: any) {
  return apply(metadata(key, value), prop());
}

export function description(desc: string) {
  return function description(original: any, prop: any, descriptor?: any) {
    return metadata(
      `${DecorationKeys.DESCRIPTION}${prop ? `.${prop}` : ".class"}`,
      desc
    )(original, prop, descriptor);
  };
}
