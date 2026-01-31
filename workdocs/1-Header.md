![Banner](./workdocs/assets/decaf-logo.svg)
## @decaf-ts/decoration

The decoration module provides a small, composable system for building and applying TypeScript decorators with flavour-aware resolution and a centralized runtime Metadata store. It lets you define base decorators, provide framework-specific overrides and extensions ("flavours"), and record/read rich metadata for classes and their members at runtime.

### Core Concepts

*   **Metadata**: A centralized, static class for reading and writing metadata for classes and their members. It supports nested keys and can mirror metadata on the constructor for easy access.
*   **Decoration**: A builder class for creating and managing decorators. It allows you to define a base set of decorators and then override or extend them with different "flavours".
*   **Flavours**: A mechanism for providing framework-specific implementations of decorators. This allows you to create libraries that are agnostic of the underlying framework, and then provide specific implementations for different environments (e.g., Angular, React, Vue).
*   **Decorators**: A set of utility decorators (`@metadata`, `@prop`, `@method`, `@param`, `@apply`) for working with the metadata system.
