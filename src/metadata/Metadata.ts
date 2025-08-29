import { Constructor } from "./types";
import { DecorationKeys, ObjectKeySplitter } from "../constants";
import "reflect-metadata";

function getValueBySplitter(
  obj: Record<string, any>,
  path: string,
  splitter: string = ObjectKeySplitter
): any {
  const keys = path.split(splitter);
  let current = obj;

  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      !Object.prototype.hasOwnProperty.call(current, key)
    )
      return undefined;
    current = current[key];
  }

  return current;
}

function setValueBySplitter(
  obj: Record<string, any>,
  path: string,
  value: any,
  splitter = ObjectKeySplitter
): void {
  const keys = path.split(splitter);
  let current: Record<any, any> = obj;

  for (const key of keys) {
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

export type ModelMetadata<M> = {
  class: Constructor<M>;
  description?: string;
  table?: string;
  properties: Record<string, any>;
  validation?: Record<string, any[]>;
  relations?: Record<string, any>;
  generated?: Record<string, any>;
  pk: string;
  fks?: Record<string, any>;
  indexes?: Record<string, any>;
};

export class Metadata {
  private static _metadata: Record<symbol, ModelMetadata<any>> = {};

  static splitter = ObjectKeySplitter;
  static baseKey = DecorationKeys.REFLECT;
  static mirror: boolean = true;

  private constructor() {}

  static getProperties(model: Constructor) {
    const meta = this.get(model);
    if (!meta) return undefined;
    return Object.keys(meta.properties);
  }
  //
  // static pk(model: Constructor) {
  //   const meta = this.get(model);
  //   if (!meta) return undefined;
  //   return Object.keys(meta.pk)[0];
  // }

  static type(model: Constructor, prop: string) {
    return this.get(model, `${DecorationKeys.PROPERTIES}.${prop}`);
  }
  //
  // static type(model: Constructor, prop: string) {
  //   return this.types(model, prop)[0];
  // }
  //
  // static types(model: Constructor, prop: string) {
  //   let designType: any = this.get(
  //     model,
  //     `${DecorationKeys.PROPERTIES}.${prop}`
  //   );
  //   if (!designType)
  //     throw new Error(`Property ${prop} not found in ${model.name}`);
  //   designType = [designType];
  //   const symbol = Symbol.for(model.toString());
  //   if (this._metadata[symbol]) {
  //     const meta = this._metadata[symbol];
  //     if (meta.validation) {
  //       const validation = meta.validation;
  //       if (validation[DecorationKeys.TYPE])
  //         designType = designType.concat(validation[DecorationKeys.TYPE]);
  //     }
  //   }
  //   return designType.filter(Boolean);
  // }

  static get<M>(model: Constructor<M>): ModelMetadata<M> | undefined;
  static get(model: Constructor, key: string): any;
  static get(model: Constructor, key?: string) {
    const symbol = Symbol.for(model.toString());
    if (!this._metadata[symbol]) return undefined;
    if (!key) return this._metadata[symbol];
    return getValueBySplitter(this._metadata[symbol], key, this.splitter);
  }

  static set(model: Constructor, key: string, value: any) {
    const symbol = Symbol.for(model.toString());
    if (!this._metadata[symbol]) this._metadata[symbol] = {} as any;
    if (
      this.mirror &&
      !Object.prototype.hasOwnProperty.call(model, this.baseKey)
    ) {
      Object.defineProperty(model, this.baseKey, {
        enumerable: false,
        configurable: false,
        writable: false,
        value: this._metadata[symbol],
      });
    }
    setValueBySplitter(this._metadata[symbol], key, value, this.splitter);
  }
}
