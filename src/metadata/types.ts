import { DecorationKeys } from "../constants";

export type BasicMetadata = {
  [DecorationKeys.PROPERTIES]: string[];
};

export type Constructor<OBJ = any> = { new (...args: any[]): OBJ };
