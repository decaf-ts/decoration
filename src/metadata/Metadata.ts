import { BasicMetadata, Constructor } from "./types";
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

export class Metadata<
  M = any,
  META extends BasicMetadata<M> = BasicMetadata<M>,
> {
  private static _instance: Metadata;
  private _metadata: Record<symbol, META> = {};

  splitter = ObjectKeySplitter;
  baseKey = DecorationKeys.REFLECT;
  static mirror: boolean = true;

  private constructor() {}

  static get instance() {
    if (!this._instance) this._instance = new Metadata();
    return this._instance;
  }

  static set instance(instance: Metadata) {
    this._instance = instance;
  }

  properties(model: Constructor) {
    const meta = this.get(model);
    if (!meta) return undefined;
    return Object.keys(meta.properties);
  }

  type(model: Constructor, prop: string) {
    return this.get(model, `${DecorationKeys.PROPERTIES}.${prop}`);
  }

  get<M>(model: Constructor<M>): META | undefined;
  get(model: Constructor, key: string): any;
  get(model: Constructor, key?: string) {
    const symbol = Symbol.for(model.toString());
    if (!this._metadata[symbol]) return undefined;
    if (!key) return this._metadata[symbol];
    return getValueBySplitter(this._metadata[symbol], key, this.splitter);
  }

  set(model: Constructor, key: string, value: any) {
    const symbol = Symbol.for(model.toString());
    if (!this._metadata[symbol]) this._metadata[symbol] = {} as any;
    if (
      Metadata.mirror &&
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

  static properties(model: Constructor) {
    return this.instance.properties(model);
  }

  static type(model: Constructor, prop: string) {
    return this.instance.type(model, prop);
  }

  static get<M, META extends BasicMetadata<M> = BasicMetadata<M>>(
    model: Constructor<M>
  ): META | undefined;
  static get(model: Constructor, key: string): any;
  static get(model: Constructor, key?: string) {
    return this.instance.get(model, key as any);
  }

  static set(model: Constructor, key: string, value: any) {
    return this.instance.set(model, key, value);
  }
}
