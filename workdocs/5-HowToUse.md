# How to Use

Practical examples for every exported surface of **@decaf-ts/decoration**. All snippets are TypeScript and mirror the behaviour covered by the unit and integration tests.

## Prerequisites

- Enable experimental decorators and decorator metadata in `tsconfig.json`:

  ```json
  {
    "compilerOptions": {
      "experimentalDecorators": true,
      "emitDecoratorMetadata": true
    }
  }
  ```

- Import `reflect-metadata` once (before decorators execute):

  ```ts
  import "reflect-metadata";
  ```

## Decoration Builder

The `Decoration` class exposes a fluent builder that lets you define base decorators, add flavour-specific extras, or override behaviour entirely.

Important behaviour note:
- Calling `define()` registers (or replaces) the *base* decorators for a key/flavour. If you call `define()` again for the same key/flavour, the previously registered base decorators are replaced with the new ones.
- Calling `extend()` (or providing extras) registers additional flavour-specific decorators that are applied after the base decorators. Crucially, calls to `define()` will NOT remove or clear previously registered extras — extras persist until they are explicitly changed via `extend()` (or a `define()`/`apply()` that provides explicit extras).

These guarantees let you safely replace base behaviour without losing already-registered platform-specific additions.

### 1. Register base decorators for the default flavour

```ts
import { Decoration } from "@decaf-ts/decoration";

const markAsComponent: ClassDecorator = (target) => {
  (target as any).__isComponent = true;
};

const tagFactory = (tag: string): ClassDecorator => (target) => {
  (target as any).__tag = tag;
};

const component = () =>
  Decoration.for("component")
    .define({ decorator: tagFactory, args: ["base"] }, markAsComponent)
    .apply();

@component()
class DefaultComponent {}

(DefaultComponent as any).__isComponent; // true
(DefaultComponent as any).__tag; // "base"
```

### Replace base decorators (base only — extras persist)

If you need to change the base behaviour later, call `define()` again for the same key/flavour — this REPLACES the previously registered base decorators but does not remove extras that were registered with `extend()`.

```ts
const calls: string[] = [];

const baseA = () =>
  Decoration.for("widget")
    .define(((t: any) => {
      calls.push(`baseA:${t.name}`);
    }) as any)
    .apply();

Decoration.for("widget")
  .extend(((t: any) => {
    calls.push(`extra:${t.name}`);
  }) as any)
  .apply();

@baseA()
class Widget1 {}

// Later we replace the base behaviour for the same key. Extras remain.
Decoration.for("widget")
  .define(((t: any) => {
    calls.push(`baseB:${t.name}`);
  }) as any)
  .apply();

@Decoration.for("widget").apply()
class Widget2 {}

// calls === [
//  `baseA:Widget1`,
//  `extra:Widget1`,
//  `baseB:Widget2`,   // base replaced
//  `extra:Widget2`    // extra persists
// ]
```

### 2. Extend base decorators with flavour-specific extras

```ts
// Register the same base behaviour as above.
const baseComponent = () =>
  Decoration.for("component")
    .define(((target: any) => target) as ClassDecorator)
    .apply();

@baseComponent()
class BaseComponent {}

Decoration.setFlavourResolver(() => "web");

const decorate = () =>
  Decoration.flavouredAs("web")
    .for("component")
    .extend({
      decorator: (platform: string): ClassDecorator => (target) => {
        (target as any).__platform = platform;
      },
      args: ["web"],
    })
    .apply();

@decorate()
class WebComponent {}

(WebComponent as any).__platform; // "web"
```

### 3. Override decorators for an alternate flavour

```ts
const base = () =>
  Decoration.for("component")
    .define(((target: any) => {
      (target as any).__base = true;
    }) as ClassDecorator)
    .apply();

@base()
class BaseBehaviour {}

Decoration.setFlavourResolver(() => "mobile");

const mobileComponent = () =>
  Decoration.flavouredAs("mobile")
    .for("component")
    .define(((target: any) => {
      (target as any).__mobile = true;
    }) as ClassDecorator)
    .apply();

@mobileComponent()
class MobileComponent {}

(MobileComponent as any).__base; // undefined – overridden
(MobileComponent as any).__mobile; // true
```

### 4. Enforce builder guard rails

The builder throws when misused; tests assert these guards and you can rely on them in your own code.

```ts
const base = Decoration.for("guarded");

// Missing key before define/extend
expect(() => (new Decoration() as any).define(() => () => undefined)).toThrow();

// Multiple overridable decorators are rejected
const overridable = {
  decorator: (() => ((target: any) => target)) as any,
  args: [],
};
expect(() => base.define(overridable as any, overridable as any)).toThrow();

// Extending the default flavour is blocked
expect(() => Decoration.for("guarded").extend(((t: any) => t) as any)).toThrow();
```

## Decorator Utilities

Helper factories under `@decaf-ts/decoration` push metadata into the shared store.

### metadata(key, value)

```ts
import { metadata, Metadata } from "@decaf-ts/decoration";

@metadata("role", "entity")
class User {}

Metadata.get(User, "role"); // "entity"
```

### prop()

```ts
import { prop, Metadata } from "@decaf-ts/decoration";

class Article {
  @prop()
  title!: string;
}

Metadata.type(Article, "title") === String; // true
```

### apply(...decorators)

```ts
import { apply } from "@decaf-ts/decoration";

const logClass: ClassDecorator = (target) => {
  console.log("class", (target as any).name);
};

const withLogging = () => apply(logClass);
const logProperty = () => apply((_, key) => console.log("prop", String(key)));

@withLogging()
class Box {
  @logProperty()
  size!: number;
}
```

### propMetadata(key, value)

```ts
import { propMetadata, Metadata } from "@decaf-ts/decoration";

class Product {
  @propMetadata("column", "price")
  price!: number;
}

Metadata.get(Product, "column"); // "price"
Metadata.type(Product, "price") === Number; // true
```

### description(text)

```ts
import { description, Metadata } from "@decaf-ts/decoration";

@description("User entity")
class User {
  @description("Primary email address")
  email!: string;
}

Metadata.description(User); // "User entity"
Metadata.description<User>(User, "email" as keyof User); // "Primary email address"
```

## Metadata Runtime Helpers

`Metadata` centralises all recorded information. The snippets below exercise the same flows as `metadata.test.ts` and the integration suite.

### Set and read nested values with constructor mirroring

```ts
import { Metadata, DecorationKeys } from "@decaf-ts/decoration";

class Person {
  name!: string;
}

Metadata.set(Person, `${DecorationKeys.DESCRIPTION}.class`, "Person model");
Metadata.set(Person, `${DecorationKeys.PROPERTIES}.name`, String);

Metadata.description(Person); // "Person model"
Metadata.properties(Person); // ["name"]

const mirror = Object.getOwnPropertyDescriptor(Person, DecorationKeys.REFLECT);
mirror?.enumerable; // false
```

### Opt out of mirroring

```ts
(Metadata as any).mirror = false;

Metadata.set(Person, `${DecorationKeys.DESCRIPTION}.class`, "No mirror");
Object.getOwnPropertyDescriptor(Person, DecorationKeys.REFLECT); // undefined

(Metadata as any).mirror = true; // reset when you are done
```

### Work with method metadata

```ts
class Service {
  get(): string {
    return "value";
  }
}

Metadata.set(
  Service,
  `${DecorationKeys.METHODS}.get.${DecorationKeys.DESIGN_PARAMS}`,
  []
);
Metadata.set(
  Service,
  `${DecorationKeys.METHODS}.get.${DecorationKeys.DESIGN_RETURN}`,
  String
);

Metadata.methods(Service); // ["get"]
Metadata.params(Service, "get"); // []
Metadata.return(Service, "get") === String; // true
```

### Leverage convenience accessors

```ts
Metadata.type(Person, "name"); // Reflects design type recorded by @prop()
Metadata.get(Person); // Full metadata payload for advanced inspection
Metadata.get(Person, DecorationKeys.CONSTRUCTOR); // Underlying constructor reference
```

## Library Registration

Prevent duplicate registration of flavour libraries via `Metadata.registerLibrary`.

```ts
import { Metadata } from "@decaf-ts/decoration";

Metadata.registerLibrary("@decaf-ts/decoration", "0.0.6");

expect(() =>
  Metadata.registerLibrary("@decaf-ts/decoration", "0.0.6")
).toThrow(/already/);
```

You now have end-to-end examples for every public API: builder setup, decorator helpers, metadata management, and library bookkeeping. Mirror the test suite for additional inspiration when adding new patterns.

Metadata class

1) Set and get nested values

Description: Use low-level get/set for arbitrary metadata paths.

```ts
import { Metadata, DecorationKeys } from "@decaf-ts/decoration";

class Org {}

Metadata.set(Org, `${DecorationKeys.DESCRIPTION}.class`, "Organization");
Metadata.set(Org, `${DecorationKeys.PROPERTIES}.name`, String);

console.log(Metadata.get(Org, `${DecorationKeys.DESCRIPTION}.class`)); // "Organization"
console.log(Metadata.type(Org, "name") === String); // true
```

2) List known properties

Description: Retrieve the keys that have recorded type info.

```ts
import { Metadata } from "@decaf-ts/decoration";

class File {
  name!: string;
  size!: number;
}

Metadata.set(File, "properties.name", String);
Metadata.set(File, "properties.size", Number);

console.log(Metadata.properties(File)); // ["name", "size"]
```

3) Mirror control

Description: Disable mirroring to the constructor if desired.

```ts
import { Metadata, DecorationKeys } from "@decaf-ts/decoration";

class Temp {}
;(Metadata as any).mirror = false; // disable

Metadata.set(Temp, `${DecorationKeys.DESCRIPTION}.class`, "Temporary");

console.log(Object.getOwnPropertyDescriptor(Temp, DecorationKeys.REFLECT)); // undefined
// Re-enable when done
;(Metadata as any).mirror = true;
```

Constants and types

Description: Access well-known keys and defaults when interacting with metadata.

```ts
import { DefaultFlavour, ObjectKeySplitter, DecorationKeys } from "@decaf-ts/decoration";

console.log(DefaultFlavour);     // "decaf"
console.log(ObjectKeySplitter);  // "."
console.log(DecorationKeys.PROPERTIES); // "properties"
```


## Coding Principles

- group similar functionality in folders (analog to namespaces but without any namespace declaration)
- one class per file;
- one interface per file (unless interface is just used as a type);
- group types as other interfaces in a types.ts file per folder;
- group constants or enums in a constants.ts file per folder;
- group decorators in a decorators.ts file per folder;
- always import from the specific file, never from a folder or index file (exceptions for dependencies on other packages);
- prefer the usage of established design patters where applicable:
  - Singleton (can be an anti-pattern. use with care);
  - factory;
  - observer;
  - strategy;
  - builder;
  - etc;
```
