import { DecorationKeys } from "../constants";

export type BasicMetadata<M> = {
  [DecorationKeys.CLASS]: Constructor<M>;
  [DecorationKeys.DESCRIPTION]?: Record<
    keyof M | `${DecorationKeys.CLASS}`,
    string
  >;
  [DecorationKeys.PROPERTIES]: Record<keyof M, Constructor<M> | undefined>;
};

export type Constructor<OBJ = any> = { new (...args: any[]): OBJ };
