![Banner](./workdocs/assets/decaf-logo.svg)
## @decaf-ts/decoration

The decoration module provides a small, composable system for building and applying TypeScript decorators with flavour-aware resolution and a centralized runtime Metadata store. It lets you define base decorators, provide framework-specific overrides and extensions ("flavours"), and record/read rich metadata for classes and their members at runtime.

![Licence](https://img.shields.io/github/license/decaf-ts/ts-workspace.svg?style=plastic)
![GitHub language count](https://img.shields.io/github/languages/count/decaf-ts/ts-workspace?style=plastic)
![GitHub top language](https://img.shields.io/github/languages/top/decaf-ts/ts-workspace?style=plastic)

[![Build & Test](https://github.com/decaf-ts/ts-workspace/actions/workflows/nodejs-build-prod.yaml/badge.svg)](https://github.com/decaf-ts/ts-workspace/actions/workflows/nodejs-build-prod.yaml)
[![CodeQL](https://github.com/decaf-ts/ts-workspace/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/decaf-ts/ts-workspace/actions/workflows/codeql-analysis.yml)[![Snyk Analysis](https://github.com/decaf-ts/ts-workspace/actions/workflows/snyk-analysis.yaml/badge.svg)](https://github.com/decaf-ts/ts-workspace/actions/workflows/snyk-analysis.yaml)
[![Pages builder](https://github.com/decaf-ts/ts-workspace/actions/workflows/pages.yaml/badge.svg)](https://github.com/decaf-ts/ts-workspace/actions/workflows/pages.yaml)
[![.github/workflows/release-on-tag.yaml](https://github.com/decaf-ts/ts-workspace/actions/workflows/release-on-tag.yaml/badge.svg?event=release)](https://github.com/decaf-ts/ts-workspace/actions/workflows/release-on-tag.yaml)

![Open Issues](https://img.shields.io/github/issues/decaf-ts/ts-workspace.svg)
![Closed Issues](https://img.shields.io/github/issues-closed/decaf-ts/ts-workspace.svg)
![Pull Requests](https://img.shields.io/github/issues-pr-closed/decaf-ts/ts-workspace.svg)
![Maintained](https://img.shields.io/badge/Maintained%3F-yes-green.svg)

![Forks](https://img.shields.io/github/forks/decaf-ts/ts-workspace.svg)
![Stars](https://img.shields.io/github/stars/decaf-ts/ts-workspace.svg)
![Watchers](https://img.shields.io/github/watchers/decaf-ts/ts-workspace.svg)

![Node Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbadges%2Fshields%2Fmaster%2Fpackage.json&label=Node&query=$.engines.node&colorB=blue)
![NPM Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbadges%2Fshields%2Fmaster%2Fpackage.json&label=NPM&query=$.engines.npm&colorB=purple)

Documentation available [here](https://decaf-ts.github.io/ts-workspace/)

Minimal size: 2.7 KB kb gzipped


# Description

@decaf-ts/decoration provides two complementary capabilities:

- A small, builder-style API (Decoration) to define and apply decorators that can vary by "flavour" (for example, different frameworks or environments) while keeping a stable key-based API.
- A centralized runtime Metadata store (Metadata) for reading and writing structured information about classes and their members, using reflect-metadata for design-time type hints.

This module aims to standardize how decorators are composed, discovered, and executed across contexts, and how metadata is stored and queried during runtime.

Main building blocks

- Decoration (builder and registry)
  - You create a decoration pipeline for a key (for("component"), for example).
  - For the default flavour ("decaf"), you define the base decorators with define(...).
  - For other flavours (e.g., "vue", "nest"), you can either override the base decorators (define for that flavour) or extend them with extras (extend(...)).
  - At runtime, a global flavour resolver (setFlavourResolver) decides which flavour to apply to a given target. If that flavour has overrides, they are used; otherwise, the default base decorators are applied. Any flavour-specific extras and default extras are appended.
  - The result of apply() is a decorator function whose name encodes the flavour and key to aid debugging.

- Decorator utilities
  - metadata(key, value): writes arbitrary metadata on a class or member.
  - prop(): captures the Reflect design:type for a property and records it in Metadata under properties.<prop>.
  - apply(...decorators): composes multiple decorators of different kinds and applies them in sequence.
  - propMetadata(key, value): convenience factory that performs both metadata(key, value) and prop().
  - description(text): stores a human-friendly description for a class or property under description.class or description.<prop>.

- Metadata store
  - Static convenience API backed by a singleton instance. It maps each class constructor to a structured metadata object.
  - Keys are nested (e.g., "properties.name", "description.class") and navigated using a splitter (default ".").
  - When mirroring is enabled (default), the internal metadata object is also defined on the constructor under a stable, non-enumerable key (DecorationKeys.REFLECT) for quick inspection.
  - Helper methods:
    - properties(ctor): list known property names that have recorded type info.
    - description(ctor, prop?): read description for class or a property.
    - type(ctor, prop): read the recorded design type for a property.
    - get/set(ctor, key): low-level access to arbitrary paths.

Constants and types

- DefaultFlavour: the default flavour identifier ("decaf").
- ObjectKeySplitter: delimiter for nested metadata keys (".").
- DecorationKeys: well-known metadata keys (REFLECT, PROPERTIES, CLASS, DESCRIPTION, design:type, etc.).
- DefaultMetadata: the default metadata shape used as a base.
- BasicMetadata / Constructor: utility types that describe metadata structure and a class constructor signature.

Design highlights

- Composable and flavour-aware: The Decoration builder allows different environments or frameworks to contribute distinct decorator behavior under the same semantic key. This is useful when building adapters (e.g., Angular vs React components) without changing user code imports.
- Predictable application order: Default decorators are applied first (or a flavour-specific override is used), followed by extras. Extras can come from the default flavour and/or the resolved flavour.
- Introspectable metadata: The Metadata store makes it straightforward to record and query runtime facts about models, properties, and behavior. This is especially helpful for ORMs, serializers, validators, and UI bindings.


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


### Related

[![Readme Card](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=ts-workspace)](https://github.com/decaf-ts/ts-workspace)

### Social

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/decaf-ts/)




#### Languages

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![ShellScript](https://img.shields.io/badge/Shell_Script-121011?style=for-the-badge&logo=gnu-bash&logoColor=white)

## Getting help

If you have bug reports, questions or suggestions please [create a new issue](https://github.com/decaf-ts/ts-workspace/issues/new/choose).

## Contributing

I am grateful for any contributions made to this project. Please read [this](./workdocs/98-Contributing.md) to get started.

## Supporting

The first and easiest way you can support it is by [Contributing](./workdocs/98-Contributing.md). Even just finding a typo in the documentation is important.

Financial support is always welcome and helps keep both me and the project alive and healthy.

So if you can, if this project in any way. either by learning something or simply by helping you save precious time, please consider donating.

## License

This project is released under the [MIT License](./LICENSE.md).

By developers, for developers...
