![Banner](./workdocs/assets/decaf-logo.svg)
## @decaf-ts/decoration

The decoration module provides a small, composable system for building and applying TypeScript decorators with flavour-aware resolution and a centralized runtime Metadata store. It lets you define base decorators, provide framework-specific overrides and extensions ("flavours"), and record/read rich metadata for classes and their members at runtime.

### Core Concepts

*   **Metadata**: A centralized, static class for reading and writing metadata for classes and their members. It supports nested keys and can mirror metadata on the constructor for easy access.
*   **Decoration**: A builder class for creating and managing decorators. It allows you to define a base set of decorators and then override or extend them with different "flavours".
*   **Flavours**: A mechanism for providing framework-specific implementations of decorators. This allows you to create libraries that are agnostic of the underlying framework, and then provide specific implementations for different environments (e.g., Angular, React, Vue).
*   **Decorators**: A set of utility decorators (`@metadata`, `@prop`, `@method`, `@param`, `@apply`) for working with the metadata system.

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

Minimal size: 5.4 KB kb gzipped


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

This guide provides examples of how to use the main features of the `@decaf-ts/decoration` library.

## Metadata

The `Metadata` class is a centralized store for runtime type information and other metadata.

### Storing and Retrieving Metadata

You can use the `@metadata` decorator or the `Metadata.set()` and `Metadata.get()` methods to store and retrieve metadata for a class or its members.

```typescript
import { metadata, Metadata } from '@decaf-ts/decoration';

@metadata('my-class-key', 'my-class-value')
class MyClass {
  @metadata('my-prop-key', 'my-prop-value')
  myProp: string;
}

// Retrieve metadata
const classMetadata = Metadata.get(MyClass, 'my-class-key'); // 'my-class-value'
const propMetadata = Metadata.get(MyClass, 'my-prop-key'); // 'my-prop-value'
```

### Working with Property and Method Types

The `@prop` and `@method` decorators automatically capture design-time type information.

```typescript
import { prop, method, Metadata } from '@decaf-ts/decoration';

class MyService {
  @prop()
  myProperty: string;

  @method()
  myMethod(param1: number): boolean {
    // ...
  }
}

// Retrieve type information
const propType = Metadata.type(MyService, 'myProperty'); // String
const returnType = Metadata.return(MyService, 'myMethod'); // Boolean
const paramTypes = Metadata.params(MyService, 'myMethod'); // [Number]
```

## Decoration

The `Decoration` class allows you to create and manage decorators with different "flavours".

### Creating a Simple Decorator

```typescript
import { Decoration } from '@decaf-ts/decoration';

const myDecorator = Decoration.for('my-decorator')
  .define((target: any) => {
    console.log('My decorator was applied to', target.name);
  })
  .apply();

@myDecorator
class MyDecoratedClass {}
```

### Creating a Flavoured Decorator

You can create different versions of a decorator for different "flavours".

```typescript
import { Decoration, DefaultFlavour } from '@decaf-ts/decoration';

// Define the default decorator
const defaultDecorator = Decoration.for('my-flavoured-decorator')
  .define((target: any) => {
    console.log('Default decorator applied to', target.name);
  })
  .apply();

// Define a decorator for the 'vue' flavour
const vueDecorator = Decoration.flavouredAs('vue')
  .for('my-flavoured-decorator')
  .define((target: any) => {
    console.log('Vue decorator applied to', target.name);
  })
  .apply();

// Use the default decorator
@defaultDecorator
class MyDefaultClass {}

// Use the 'vue' decorator by setting the flavour
Decoration.setResolver(() => 'vue');

@defaultDecorator
class MyVueClass {}
```

### Extending Decorators

You can extend an existing decorator with additional functionality.

```typescript
import { Decoration } from '@decaf-ts/decoration';

const baseDecorator = Decoration.for('my-extended-decorator')
  .define((target: any) => {
    console.log('Base decorator applied');
  })
  .apply();

const extendedDecorator = Decoration.for('my-extended-decorator')
  .extend((target: any) => {
    console.log('Extended decorator applied');
  })
  .apply();

@extendedDecorator
class MyExtendedClass {}
// Console output:
// Base decorator applied
// Extended decorator applied
```

## Utility Decorators

### `@apply`

The `@apply` decorator allows you to apply multiple decorators to a single target.

```typescript
import { apply } from '@decaf-ts/decoration';

const decorator1 = (target: any) => { console.log('Decorator 1'); };
const decorator2 = (target: any) => { console.log('Decorator 2'); };

@apply(decorator1, decorator2)
class MyMultipliedClass {}
```

### `@propMetadata` and `@methodMetadata`

These decorators are shortcuts for applying metadata and capturing type information at the same time.

```typescript
import { propMetadata, methodMetadata, Metadata } from '@decaf-ts/decoration';

class MyMetaClass {
  @propMetadata('my-key', 'my-value')
  myProp: string;

  @methodMetadata('my-method-key', 'my-method-value')
  myMethod() {}
}

const propMeta = Metadata.get(MyMetaClass, 'my-key'); // 'my-value'
const propType = Metadata.type(MyMetaClass, 'myProp'); // String
const methodMeta = Metadata.get(MyMetaClass, 'my-method-key'); // 'my-method-value'
```


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
