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
  const keys = path.split(splitter).filter((k) => k.length > 0);
  if (keys.length === 0) return;

  let current: Record<any, any> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (
      current[key] === undefined ||
      current[key] === null ||
      typeof current[key] !== "object"
    ) {
      current[key] = {};
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
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
export class Metadata {
  /**
   * @description In-memory storage of metadata by constructor symbol
   * @summary Maps a Symbol derived from the constructor to its metadata object, enabling efficient lookup.
   */
  private static _metadata: Record<symbol, any> = {};

  /**
   * @description Path delimiter for nested metadata keys
   * @summary Used by get/set operations to navigate nested structures, defaults to ObjectKeySplitter.
   */
  static splitter = ObjectKeySplitter;
  /**
   * @description Symbol key used to mirror metadata on the constructor
   * @summary When mirroring is enabled, the metadata object is defined on the constructor under this non-enumerable key.
   */
  static baseKey = DecorationKeys.REFLECT;
  /**
   * @description Controls whether metadata is mirrored onto the constructor
   * @summary When true, the metadata object is defined on the constructor under the non-enumerable baseKey.
   */
  static mirror: boolean = true;

  private constructor() {}

  /**
   * @description Lists known property keys for a model
   * @summary Reads the metadata entry and returns the names of properties that have recorded type information.
   * @param {Constructor} model The target constructor
   * @return {string[]|undefined} Array of property names or undefined if no metadata exists
   */
  static properties(model: Constructor): string[] | undefined {
    const meta = this.get(model);
    if (!meta) return undefined;
    return Object.keys(meta.properties);
  }

  /**
   * @description Retrieves a human-readable description for a class or a property
   * @summary Looks up the description stored under the metadata "description" map. If a property key is provided, returns the property's description; otherwise returns the class description.
   * @template M
   * @param {Constructor<M>} model The target constructor whose description is being retrieved
   * @param {keyof M} [prop] Optional property key for which to fetch the description
   * @return {string|undefined} The description text if present, otherwise undefined
   */
  static description<M>(model: Constructor<M>, prop?: keyof M) {
    return this.get(
      model,
      [DecorationKeys.DESCRIPTION, prop ? prop : DecorationKeys.CLASS].join(
        ObjectKeySplitter
      )
    );
  }

  /**
   * @description Retrieves the recorded design type for a property
   * @summary Reads the metadata entry under "properties.<prop>" to return the constructor recorded for the given property name.
   * @param {Constructor} model The target constructor
   * @param {string} prop The property name whose type should be returned
   * @return {Constructor|undefined} The constructor reference of the property type or undefined if not available
   */
  static type(model: Constructor, prop: string) {
    return this.get(model, `${DecorationKeys.PROPERTIES}.${prop}`);
  }

  /**
   * @description Retrieves metadata for a model or a specific key within it
   * @summary When called with a constructor only, returns the entire metadata object associated with the model. When a key path is provided, returns the value stored at that nested key.
   * @template M
   * @template META
   * @param {Constructor<M>} model The target constructor used to locate the metadata record
   * @param {string} [key] Optional nested key path to fetch a specific value
   * @return {META|*|undefined} The metadata object, the value at the key path, or undefined if nothing exists
   */
  static get<M, META extends BasicMetadata<M> = BasicMetadata<M>>(
    model: Constructor<M>
  ): META | undefined;
  static get(model: Constructor, key: string): any;
  static get(model: Constructor, key?: string) {
    const symbol = Symbol.for(model.toString());
    if (!this._metadata[symbol]) return undefined;
    if (!key) return this._metadata[symbol];
    return getValueBySplitter(this._metadata[symbol], key, this.splitter);
  }

  /**
   * @description Writes a metadata value at a given nested key path
   * @summary Ensures the metadata record exists for the constructor, mirrors it on the constructor when enabled, and sets the provided value on the nested key path using the configured splitter.
   * @param {Constructor} model The target constructor to which the metadata belongs
   * @param {string} key The nested key path at which to store the value
   * @param {*} value The value to store in the metadata
   * @return {void}
   */
  static set(model: Constructor, key: string, value: any) {
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
}
