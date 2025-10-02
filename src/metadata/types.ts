import { DecorationKeys } from "../constants";

export type BasicMetadata<M> = {
  [DecorationKeys.CLASS]: Constructor<M>;
  [DecorationKeys.DESCRIPTION]?: Record<
    keyof M | `${DecorationKeys.CLASS}`,
    string
  >;
  [DecorationKeys.PROPERTIES]: Record<keyof M, Constructor<M> | undefined>;
  [DecorationKeys.METHODS]: Record<keyof M, Constructor<M> | undefined>;
};

/**
 * @description Constructor type for creating instances of a given object type
 * @summary Defines a generic constructor signature that can instantiate objects of type OBJ with any arguments.
 * @template OBJ
 * @typedef {Constructor<OBJ>} Constructor
 * @memberOf module:decoration
 */
export type Constructor<OBJ = any> = { new (...args: any[]): OBJ };
