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
