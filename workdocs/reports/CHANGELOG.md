# Changelog

## v0.18.4

### Fixes

*   **DECAF-809**: Scoped `Metadata.constr` to the model's own `__original` static property instead of relying on the ES class static-inheritance fallback, so per-model decoration writes land in each model's own metadata bucket instead of a shared base-model bucket (restores per-model metadata scoping on consumers whose decorated base classes are extended by decorated subclasses).
*   flavour resolution (`Decoration.for` flavour resolver) now inherits declared flavour from the constructor inheritance chain explicitly, keeping `uses` inheritance working now that metadata reads are per-model scoped.

## v0.0.5

### New Features

*   **DECAF-206**: Enhanced decorators, added E2E tests, and extended the flavour system.

### Other

*   **DECAF-206**: Updates and circular dependency fixes.
