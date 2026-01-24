import { BasicMetadata, Constructor } from "./types";
import {
  DecorationKeys,
  DecorationState,
  DefaultFlavour,
  ObjectKeySplitter,
} from "../constants";
import "reflect-metadata";
import { PACKAGE_NAME, VERSION } from "../version";
import {
  resolvePendingDecorators,
  resolveFlavour,
} from "../decoration/metadataLink";

/**
 * @description Retrieves a nested value from an object given a path.
 * @summary Walks an object structure using a splitter-delimited path and returns the value at that location or `undefined` if any key is missing.
 * @param {Record<string, any>} obj Object to traverse for the lookup.
 * @param {string} path Splitter-delimited path to the desired value (e.g., "a.b.c").
 * @param {string} [splitter=ObjectKeySplitter] Delimiter used to separate the path segments.
 * @return {any|undefined} Value resolved at the given path or `undefined` when not found.
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
export function getValueBySplitter(
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
 * @description Sets a nested value on an object given a path.
 * @summary Traverses or creates intermediate objects following a splitter-delimited path and assigns the provided value at the destination key.
 * @param {Record<string, any>} obj Object to mutate while drilling into nested keys.
 * @param {string} path Splitter-delimited destination path (e.g., "a.b.c").
 * @param {any} value Value to set at the destination node.
 * @param {string} [splitter=ObjectKeySplitter] Delimiter used to separate the path segments.
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
export function setValueBySplitter(
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
 * @description Centralized runtime metadata store bound to constructors.
 * @summary Provides utilities to read and write structured metadata for classes and their members, with optional mirroring onto the constructor via a well-known symbol key. Supports nested key paths using a configurable splitter and offers both instance and static APIs.
 * @template M The model type the metadata belongs to.
 * @template META Extends BasicMetadata<M> representing the metadata structure.
 * @param {string} [flavour=DefaultFlavour] Optional flavour identifier applied when instantiating helper builders.
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
   * @description Property index store keyed by constructor symbol
   * @summary Tracks property keys that have been decorated, independent of metadata bucket mutations.
   */
  private static _propertiesIndex: Record<symbol, Set<string>> = {};

  /**
   * @description Path delimiter for nested metadata keys
   * @summary Used by get/set operations to navigate nested structures, defaults to ObjectKeySplitter.
   */
  static splitter = ObjectKeySplitter;
  /**
   * @description Symbol key used to mirror metadata on the constructor
   * @summary When mirroring is enabled, the metadata object is defined on the constructor under the non-enumerable baseKey.
   */
  static baseKey = DecorationKeys.REFLECT;
  /**
   * @description Controls whether metadata is mirrored onto the constructor
   * @summary When true, the metadata object is defined on the constructor under the non-enumerable baseKey.
   */
  static mirror: boolean = true;

  private constructor() {}

  static Symbol<M>(obj: Constructor<M>) {
    return Symbol.for([obj.toString(), obj.name].join(" - "));
  }

  // No scheduling or readiness tracking here; callers should only
  // use Reflect.getOwnMetadata to read design:type when needed.

  /**
   * @description Lists known property keys for a model.
   * @summary Reads the metadata entry and returns the names of properties that have recorded type information.
   * @param {Constructor} model Target constructor whose property metadata should be inspected.
   * @return {string[]|undefined} Array of property names or `undefined` if no metadata exists.
   */
  static properties(model: Constructor): string[] | undefined {
    const resolvedModel = this.constr(model);
    const symbol = this.Symbol(resolvedModel);
    const indexed = this._propertiesIndex[symbol];
    if (indexed && indexed.size) return [...indexed];
    const meta = this.get(resolvedModel);
    if (!meta || !meta.properties) return undefined;
    return Object.keys(meta.properties);
  }

  /**
   * @description Lists known methods for a model.
   * @summary Reads the metadata entry and returns the method names that have recorded signature metadata for the provided constructor.
   * @param {Constructor} model Target constructor whose method metadata should be inspected.
   * @return {string[]|undefined} Array of method names or `undefined` if no metadata exists.
   */
  static methods(model: Constructor): string[] | undefined {
    const meta = this.get(model, DecorationKeys.METHODS);
    if (!meta) return undefined;
    return Object.keys(meta);
  }

  /**
   * @description Retrieves a human-readable description for a class or a property.
   * @summary Looks up the description stored under the metadata "description" map. If a property key is provided, returns the property's description; otherwise returns the class description.
   * @template M
   * @param {Constructor<M>} model Target constructor whose description is being retrieved.
   * @param {string} [prop] Optional property key (typed as `keyof M`) for which to fetch the description.
   * @return {string|undefined} Description text if present, otherwise `undefined`.
   */
  static description<M>(
    model: Constructor<M>,
    prop?: keyof M
  ): string | undefined {
    return this.get(
      model,
      this.key(
        DecorationKeys.DESCRIPTION,
        (prop ? prop : DecorationKeys.CLASS) as string
      )
    );
  }

  static flavourOf(model: Constructor): string {
    return resolveFlavour(model);
  }

  static flavouredAs(flavour: string): Constructor[] {
    return this.innerGet(Symbol.for(DecorationKeys.FLAVOUR), flavour) || [];
  }

  static registeredFlavour(model: Constructor): string | undefined {
    const registry = this.innerGet(Symbol.for(DecorationKeys.FLAVOUR));
    if (!registry) return undefined;
    const constr = this.constr(model);
    let fallback: string | undefined;
    for (const [flavour, constructors] of Object.entries(
      registry as Record<string, Constructor[]>
    )) {
      if (Array.isArray(constructors)) {
        const resolved = constructors.some(
          (registered) => this.constr(registered) === constr
        );
        if (resolved) {
          if (flavour === DefaultFlavour) {
            fallback = fallback || flavour;
            continue;
          }
          return flavour;
        }
      }
    }
    return fallback;
  }

  /**
   * @description Retrieves the recorded params for a method.
   * @summary Reads the metadata entry under `methods.<prop>.design:paramtypes` to return the parameter constructors for the given method.
   * @template M
   * @param {Constructor<M>} model Target constructor owning the method metadata.
   * @param {string} prop Method name whose parameters should be fetched.
   * @return {any[]|undefined} Array of constructor references describing each parameter or `undefined` when not available.
   */
  static params<M>(model: Constructor<M>, prop: string): any[] | undefined {
    return this.get(
      model,
      this.key(DecorationKeys.METHODS, prop, DecorationKeys.DESIGN_PARAMS)
    );
  }

  /**
   * @description Retrieves a single recorded parameter type for a method.
   * @summary Looks up the parameter metadata for the provided index, enforcing bounds and returning the constructor reference for that argument.
   * @template M
   * @param {Constructor<M>} model Target constructor owning the method metadata.
   * @param {string} prop Method name whose parameter should be returned.
   * @param {number} index Zero-based index of the desired parameter metadata.
   * @return {any|undefined} Constructor reference for the parameter or `undefined` if not recorded.
   */
  static param<M>(
    model: Constructor<M>,
    prop: string,
    index: number
  ): any | undefined {
    const params = this.params(model, prop);
    if (!params) return undefined;
    if (index > params.length - 1)
      throw new Error(
        `Parameter index ${index} out of range for ${String(prop)}`
      );
    return params[index];
  }

  /**
   * @description Retrieves the recorded return type for a method.
   * @summary Reads the metadata entry under `methods.<prop>.design:returntype` to return the return type for the given method.
   * @template M
   * @param {Constructor<M>} model Target constructor whose method metadata should be inspected.
   * @param {string} prop Method name whose return type should be fetched.
   * @return {any|undefined} Constructor reference for the return type or `undefined` when not available.
   */
  static return<M>(model: Constructor<M>, prop: string): any | undefined {
    return this.get(
      model,
      this.key(DecorationKeys.METHODS, prop, DecorationKeys.DESIGN_RETURN)
    );
  }

  /**
   * @description Retrieves the recorded design type for a property.
   * @summary Reads the metadata entry under `properties.<prop>` to return the constructor recorded for the given property name.
   * @param {Constructor} model Target constructor whose property metadata should be inspected.
   * @param {string} prop Property name whose type metadata should be returned.
   * @return {Constructor|undefined} Constructor reference for the property type or `undefined` if not available.
   */
  static type(model: Constructor, prop: string) {
    return this.get(model, this.key(DecorationKeys.PROPERTIES, prop));
  }

  /**
   * @description Resolves the canonical constructor associated with the provided model handle and metadata.
   * @summary Returns the stored constructor reference when the provided model is a proxy or reduced value. Falls back to the original model when no constructor metadata has been recorded yet.
   * @template M
   * @param {Constructor<M>} model Model used when recording metadata.
   * @return {Constructor<M>} Canonical constructor if stored, otherwise the provided one`.
   */
  static constr<M>(model: Constructor<M>): Constructor<M> {
    return model[DecorationKeys.CONSTRUCTOR as keyof typeof model] || model;
  }

  /**
   * @description Retrieves metadata for a model or a specific key within it.
   * @summary When called with a constructor only, returns the entire metadata object associated with the model. When a key path is provided, returns the value stored at that nested key.
   * @template M
   * @template META
   * @param {Constructor<M>} model Target constructor used to locate the metadata record.
   * @return {META|undefined} Metadata object, the value at the key path, or `undefined` if nothing exists.
   */
  static get<M, META extends BasicMetadata<M> = BasicMetadata<M>>(
    model: Constructor<M>
  ): META | undefined;
  /**
   * @description Retrieves metadata for a model or a specific key within it.
   * @summary When called with a constructor only, returns the entire metadata object associated with the model. When a key path is provided, returns the value stored at that nested key.
   * @template M
   * @template META
   * @param {Constructor<M>} model Target constructor used to locate the metadata record.
   * @param {string} key Nested key path to fetch a specific value.
   * @return {META|*|undefined} Metadata object, the value at the key path, or `undefined` if nothing exists.
   */
  static get(model: Constructor, key: string): any;
  /**
   * @description Retrieves metadata for a model or a specific key within it.
   * @summary When called with a constructor only, returns the entire metadata object associated with the model. When a key path is provided, returns the value stored at that nested key.
   * @template M
   * @template META
   * @param {Constructor<M>|string} model Target constructor used to locate the metadata record or a pre-resolved symbol identifier.
   * @param {string} [key] Optional nested key path to fetch a specific value.
   * @return {META|*|undefined} Metadata object, the value at the key path, or `undefined` if nothing exists.
   */
  static get(model: Constructor, key?: string) {
    if (key === DecorationKeys.CONSTRUCTOR) return this.constr(model);
    const resolvedModel = this.constr(model);
    const constructors = this.collectConstructorChain(resolvedModel);
    constructors
      .filter((c) => this.isDecorated(c) === DecorationState.PENDING)
      .forEach((constructor) => {
        resolvePendingDecorators(constructor);
      });
    if (constructors.length === 0) {
      const fallbackSymbol = Symbol.for(resolvedModel.toString());
      return this.innerGet(fallbackSymbol, key);
    }
    const collectedValues = constructors
      .map((ctor) => this.innerGet(this.Symbol(ctor), key))
      .filter((value) => value !== undefined);

    if (collectedValues.length === 0) return undefined;

    return this.mergeMetadataChain(collectedValues);
  }

  private static isDecorated(model: Constructor): boolean | DecorationState {
    const resolvedModel = this.constr(model);
    const meta = this.innerGet(
      this.Symbol(resolvedModel),
      DecorationKeys.DECORATION
    );
    return meta || false;
  }

  /**
   * @description Retrieves metadata stored under a symbol key.
   * @summary Internal helper that resolves and optionally drills into the in-memory metadata map for the provided symbol and key path.
   * @param {symbol} symbol Symbol representing the metadata bucket.
   * @param {string|symbol} [key] Optional nested key referencing a specific metadata entry.
   * @return {any} Stored metadata object or value for the provided key, or `undefined` when absent.
   */
  private static innerGet(symbol: symbol, key?: string | symbol) {
    if (!this._metadata[symbol]) return undefined;
    if (!key) return this._metadata[symbol];
    if (typeof key === "string")
      return getValueBySplitter(this._metadata[symbol], key, this.splitter);
    return this._metadata[symbol][key];
  }

  /**
   * @description Builds the inheritance chain for a constructor, ordered from base to most-specific class.
   * @summary Walks the prototype chain starting from the provided constructor until reaching Function/Object and returns the collected constructors.
   * @param {Constructor} model Constructor whose chain should be collected.
   * @return {Constructor[]} Array of constructors ordered from base to leaf.
   */
  private static collectConstructorChain(model: Constructor): Constructor[] {
    const chain: Constructor[] = [];
    let current: any = model;

    while (typeof current === "function" && current !== Function) {
      chain.push(current as Constructor);
      const parent = Object.getPrototypeOf(current);
      if (!parent || parent === Function || parent === Object) break;
      current = parent;
    }

    return chain.reverse();
  }

  /**
   * @description Merges metadata values collected across the inheritance chain.
   * @summary Performs a deep merge for plain objects while letting non-object values override earlier ones to preserve child metadata precedence.
   * @param {any[]} values Metadata values gathered from base to child.
   * @return {any} Aggregated metadata value respecting inheritance precedence.
   */
  private static mergeMetadataChain(values: any[]) {
    let acc: any = undefined;

    for (const value of values) {
      if (acc === undefined) {
        acc = this.cloneMetadataValue(value);
        continue;
      }

      if (this.isPlainObject(acc) && this.isPlainObject(value)) {
        acc = this.mergePlainObjects(
          acc as Record<string, any>,
          value as Record<string, any>
        );
        continue;
      }

      acc = this.cloneMetadataValue(value);
    }

    return acc;
  }

  /**
   * @description Produces a deep clone of a metadata value when necessary.
   * @summary Arrays are shallow-cloned, plain objects are deep-cloned, and primitive/function values are returned as-is.
   * @param {any} value Metadata value to clone.
   * @return {any} Cloned metadata value preventing mutation of the backing store.
   */
  private static cloneMetadataValue(value: any) {
    if (Array.isArray(value)) return [...value];
    if (this.isPlainObject(value))
      return this.mergePlainObjects({}, value as Record<string, any>);
    return value;
  }

  /**
   * @description Deeply merges two plain metadata objects.
   * @summary Recursively merges nested plain objects while cloning arrays; values from `source` override those from `target` when conflicts occur.
   * @param {Record<string, any>} target Base object to merge into.
   * @param {Record<string, any>} source Object providing overriding metadata.
   * @return {Record<string, any>} Newly merged metadata object.
   */
  private static mergePlainObjects(
    target: Record<string, any>,
    source: Record<string, any>
  ): Record<string, any> {
    const result: Record<string, any> = { ...target };

    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (this.isPlainObject(sourceValue)) {
        result[key] = this.isPlainObject(targetValue)
          ? this.mergePlainObjects(
              targetValue as Record<string, any>,
              sourceValue as Record<string, any>
            )
          : this.mergePlainObjects({}, sourceValue as Record<string, any>);
        continue;
      }

      if (Array.isArray(sourceValue)) {
        result[key] = [...sourceValue];
        continue;
      }

      result[key] = sourceValue;
    }

    return result;
  }

  /**
   * @description Checks if a value is a plain object suitable for deep merging.
   * @summary Ensures arrays and null are excluded while accepting objects created via literal/class syntax.
   * @param {any} value Value to inspect.
   * @return {boolean} True when the value is a plain object.
   */
  private static isPlainObject(value: any): value is Record<string, any> {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  /**
   * @description Writes metadata under a symbol key.
   * @summary Internal helper that ensures the metadata bucket exists for the provided symbol and persists the given value, drilling into nested structures when the key is a string path.
   * @param {symbol} symbol Symbol representing the metadata bucket.
   * @param {string|symbol} key Nested key path or direct symbol under which to store the metadata value.
   * @param {any} value Value persisted in the metadata store.
   * @return {void}
   */
  private static innerSet(symbol: symbol, key: string | symbol, value: any) {
    if (!this._metadata[symbol]) this._metadata[symbol] = {} as any;
    if (typeof key === "string")
      return setValueBySplitter(
        this._metadata[symbol],
        key,
        value,
        this.splitter
      );
    this._metadata[symbol][key] = value;
  }

  /**
   * @description Writes a metadata value at a given nested key path.
   * @summary Ensures the metadata record exists for the constructor, mirrors it on the constructor when enabled, and sets the provided value on the nested key path using the configured splitter.
   * @template M
   * @param {Constructor<M>|string} model Target constructor to which the metadata belongs or a direct identifier string.
   * @param {string} key Nested key path at which to store the value.
   * @param {any} value Value to store in the metadata.
   * @return {void}
   */
  static set(model: Constructor | string, key: string, value: any): void {
    if (key === DecorationKeys.CONSTRUCTOR) {
      Object.defineProperty(model, DecorationKeys.CONSTRUCTOR, {
        enumerable: false,
        configurable: false,
        writable: false,
        value: value,
      });
      return;
    }
    if (typeof model !== "string") model = this.constr(model) || model;
    const symbol =
      typeof model === "string" ? Symbol.for(model) : this.Symbol(model);
    if (typeof key === "string") {
      const propPrefix = `${DecorationKeys.PROPERTIES}${this.splitter}`;
      if (key.startsWith(propPrefix)) {
        const prop = key.slice(propPrefix.length);
        if (prop.length) {
          const set = this._propertiesIndex[symbol] || new Set<string>();
          set.add(prop);
          this._propertiesIndex[symbol] = set;
        }
      } else if (
        key === DecorationKeys.PROPERTIES &&
        this.isPlainObject(value)
      ) {
        const set = this._propertiesIndex[symbol] || new Set<string>();
        Object.keys(value as Record<string, any>).forEach((prop) => {
          set.add(prop);
        });
        if (set.size) this._propertiesIndex[symbol] = set;
      }
    }
    this.innerSet(symbol, key, value);
    if (
      typeof model !== "string" &&
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
  }

  /**
   * @description Registers a decoration-aware library and its version.
   * @summary Stores the version string for an integrating library under the shared libraries metadata symbol, preventing duplicate registrations for the same library identifier.
   * @param {string} library Package name or identifier to register.
   * @param {string} version Semantic version string associated with the library.
   * @return {void}
   * @throws {Error} If the library has already been registered.
   */
  static registerLibrary(library: string, version: string) {
    const symbol = Symbol.for(DecorationKeys.LIBRARIES);
    const lib = this.innerGet(symbol, library);
    if (lib)
      throw new Error(
        `Library already ${library} registered with version ${version}`
      );
    this.innerSet(symbol, library, version);
  }

  /**
   * @description Lists registered decoration-aware libraries.
   * @summary Returns the in-memory map of library identifiers to semantic versions that have been registered with the Decoration metadata store.
   * @return {Record<string, string>} Map of registered library identifiers to their version strings.
   */
  static libraries(): Record<string, string> {
    const symbol = Symbol.for(DecorationKeys.LIBRARIES);
    return this.innerGet(symbol) || {};
  }

  /**
   * @description Joins path segments using the current splitter.
   * @summary Constructs a nested metadata key by concatenating string segments with the configured splitter for use with the metadata store.
   * @param {...string} strs Key segments to join into a full metadata path.
   * @return {string} Splitter-joined metadata key.
   */
  static key(...strs: string[]) {
    return strs.join(this.splitter);
  }
}

Metadata.registerLibrary(PACKAGE_NAME, VERSION);
