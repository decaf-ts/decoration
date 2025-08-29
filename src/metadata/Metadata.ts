import { BasicMetadata, Constructor } from "./types";
import { DecorationKeys, ObjectKeySplitter } from "../constants";
import "reflect-metadata";

/**
 * @description Retrieves a nested value from an object given a path
 * @summary Walks an object structure using a splitter-delimited path and returns the value at that location or undefined if any key is missing.
 * @param {Record<string, any>} obj The object to traverse
 * @param {string} path The path to the desired value (e.g., "a.b.c")
 * @param {string} [splitter=ObjectKeySplitter] The delimiter used to split the path
 * @return {*} The resolved value at the given path or undefined if not found
 * @function getValueBySplitter
 * @mermaid
 * sequenceDiagram
 *   participant C as Caller
 *   participant F as getValueBySplitter
 *   participant O as Object
 *   C->>F: (obj, path, splitter)
 *   F->>F: split path into keys
 *   loop for each key
 *     F->>O: access current[key]
 *     alt missing or nullish
 *       F-->>C: return undefined
 *     end
 *   end
 *   F-->>C: return final value
 * @memberOf module:decoration
 */
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

/**
 * @description Sets a nested value on an object given a path
 * @summary Traverses or creates intermediate objects following a splitter-delimited path and assigns the provided value at the destination key.
 * @param {Record<string, any>} obj The object to mutate
 * @param {string} path The destination path (e.g., "a.b.c")
 * @param {*} value The value to set at the destination
 * @param {string} [splitter=ObjectKeySplitter] The delimiter used to split the path
 * @return {void}
 * @function setValueBySplitter
 * @mermaid
 * sequenceDiagram
 *   participant C as Caller
 *   participant F as setValueBySplitter
 *   participant O as Object
 *   C->>F: (obj, path, value, splitter)
 *   F->>F: split path into keys
 *   loop for each key
 *     alt key missing
 *       F->>O: create intermediate object
 *     else key exists
 *       F->>O: descend into existing object
 *     end
 *   end
 *   F-->>C: void
 * @memberOf module:decoration
 */
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

/**
 * @description Centralized runtime metadata store bound to constructors
 * @summary Provides utilities to read and write structured metadata for classes and their members, with optional mirroring onto the constructor via a well-known symbol key. Supports nested key paths using a configurable splitter and offers both instance and static APIs.
 * @template M The model type the metadata belongs to
 * @template META Extends BasicMetadata<M> representing the metadata structure
 * @class
 * @example
 * // Define and read metadata for a class
 * class User { name!: string }
 * Metadata.set(User, "description.class", "A user model");
 * Metadata.set(User, "properties.name", String);
 * const desc = Metadata.get(User, "description.class"); // "A user model"
 * const type = Metadata.type(User, "name"); // String
 * @mermaid
 * sequenceDiagram
 *   participant C as Constructor
 *   participant S as Metadata (static)
 *   C->>S: set(User, "properties.name", String)
 *   C->>S: get(User, "properties.name")
 *   S-->>C: String
 */
export class Metadata<
  M = any,
  META extends BasicMetadata<M> = BasicMetadata<M>,
> {
  /**
   * @description Singleton instance holder
   * @summary Stores the shared Metadata instance used by static helpers
   */
  private static _instance: Metadata;
  /**
   * @description In-memory storage of metadata by constructor symbol
   * @summary Maps a Symbol derived from the constructor to its metadata object, enabling efficient lookup.
   */
  private _metadata: Record<symbol, META> = {};

  /**
   * @description Path delimiter for nested metadata keys
   * @summary Used by get/set operations to navigate nested structures, defaults to ObjectKeySplitter.
   */
  splitter = ObjectKeySplitter;
  /**
   * @description Symbol key used to mirror metadata on the constructor
   * @summary When mirroring is enabled, the metadata object is defined on the constructor under this non-enumerable key.
   */
  baseKey = DecorationKeys.REFLECT;
  /**
   * @description Controls whether metadata is mirrored onto the constructor
   * @summary When true, the metadata object is defined on the constructor under the non-enumerable baseKey.
   */
  static mirror: boolean = true;

  private constructor() {}

  /**
   * @description Accessor for the singleton Metadata instance
   * @summary Lazily initializes and returns the shared Metadata instance used by all static methods.
   * @return {Metadata} The singleton instance
   */
  static get instance() {
    if (!this._instance) this._instance = new Metadata();
    return this._instance;
  }

  /**
   * @description Replaces the singleton Metadata instance
   * @summary Allows swapping the default instance for testing or customization purposes.
   * @param {Metadata} instance The new Metadata instance to use
   */
  static set instance(instance: Metadata) {
    this._instance = instance;
  }

  /**
   * @description Lists known property keys for a model
   * @summary Reads the metadata entry and returns the names of properties that have recorded type information.
   * @param {Constructor} model The target constructor
   * @return {string[]|undefined} Array of property names or undefined if no metadata exists
   */
  properties(model: Constructor) {
    const meta = this.get(model);
    if (!meta) return undefined;
    return Object.keys(meta.properties);
  }

  description<M>(model: Constructor<M>, prop?: keyof M) {
    return this.get(
      model,
      `${DecorationKeys.DESCRIPTION}${prop ? `.${prop.toString()}` : DecorationKeys.CLASS}`
    );
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

  static description<M>(model: Constructor, prop?: keyof M) {
    return this.instance.description(model, prop);
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
