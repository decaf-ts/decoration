# How to Use

This guide shows practical examples for all main elements of @decaf-ts/decoration. Each example includes a short description and a TypeScript snippet.

Prerequisites

- Enable experimental decorators and emit decorator metadata in tsconfig.json:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

- Import reflect-metadata once in your test/app entry:

```ts
import "reflect-metadata";
```

Decoration class

1) Define base decorators for the default flavour ("decaf")

Description: Create a decoration pipeline for key "component" that applies two decorators to any class.

```ts
import { Decoration } from "@decaf-ts/decoration";

// A simple class decorator factory (just logs)
const logFactory = (tag: string): ClassDecorator => (target) => {
  console.log(`[${tag}]`, (target as any).name);
};
const mark: ClassDecorator = (t) => {
  (t as any).__mark = true;
};

// Register base decorators for the default flavour
const component = Decoration.for("component")
  .define({ decorator: logFactory, args: ["base"] }, mark)
  .apply();

// Use it
@component
class MyComponent {}
```

2) Extend base decorators with flavour-specific extras

Description: Provide extra behavior when the runtime flavour is resolved to "web" while keeping default base decorators.

```ts
import { Decoration } from "@decaf-ts/decoration";

// Default base
Decoration.for("component")
  .define(((t: any) => t) as ClassDecorator)
  .apply();

// Flavour-specific extras
Decoration.flavouredAs("web")
  .for("component")
  .extend({
    decorator: (tag: string): ClassDecorator => (target) => {
      (target as any).__platform = tag;
    },
    args: ["web"],
  })
  .apply();

// Choose flavour at runtime
Decoration.setFlavourResolver(() => "web");

const dec = Decoration.flavouredAs("web").for("component").apply();

@dec
class WebComponent {}

console.log((WebComponent as any).__platform); // "web"
```

3) Override base decorators for a specific flavour

Description: Replace default decorators entirely for flavour "mobile".

```ts
import { Decoration } from "@decaf-ts/decoration";

// Default base
Decoration.for("component")
  .define(((t: any) => { (t as any).__base = true; }) as ClassDecorator)
  .apply();

// Flavour override (no extras needed)
Decoration.flavouredAs("mobile")
  .for("component")
  .define(((t: any) => { (t as any).__mobile = true; }) as ClassDecorator)
  .apply();

Decoration.setFlavourResolver(() => "mobile");
const dec = Decoration.flavouredAs("mobile").for("component").apply();

@dec()
class MobileComponent {}

console.log((MobileComponent as any).__base);   // undefined (overridden)
console.log((MobileComponent as any).__mobile); // true
```

Decorator utilities

1) metadata(key, value)

Description: Attach arbitrary metadata to a class or property.

```ts
import { metadata, Metadata } from "@decaf-ts/decoration";

@metadata("role", "entity")
class User {
  @((metadata("format", "email") as unknown) as PropertyDecorator)
  email!: string;
}

console.log(Metadata.get(User, "role")); // "entity"
console.log(Metadata.get(User, "format")); // "email"
```

2) prop()

Description: Record the reflected design type for a property.

```ts
import "reflect-metadata";
import { prop, Metadata } from "@decaf-ts/decoration";

class Article {
  @((prop() as unknown) as PropertyDecorator)
  title!: string;
}

console.log(Metadata.type(Article, "title") === String); // true
```

3) apply(...decorators)

Description: Compose multiple decorators of different kinds.

```ts
import { apply } from "@decaf-ts/decoration";

const dClass: ClassDecorator = (t) => console.log("class", (t as any).name);
const dProp: PropertyDecorator = (_t, key) => console.log("prop", String(key));
const dMethod: MethodDecorator = (_t, key) => console.log("method", String(key));

@apply(dClass)
class Box {
  @((apply(dProp) as unknown) as PropertyDecorator)
  size!: number;

  @((apply(dMethod) as unknown) as MethodDecorator)
  open() {}
}
```

4) propMetadata(key, value)

Description: Combine setting arbitrary metadata and capturing the property's design type.

```ts
import { propMetadata, Metadata } from "@decaf-ts/decoration";

class Product {
  @propMetadata("column", "price")
  price!: number;
}

console.log(Metadata.get(Product, "column")); // "price"
console.log(Metadata.type(Product, "price") === Number); // true
```

5) description(text)

Description: Store human-readable documentation for class and property.

```ts
import { description, Metadata } from "@decaf-ts/decoration";

@description("User entity")
class User {
  @description("Primary email address")
  email!: string;
}

console.log(Metadata.description(User)); // "User entity"
console.log(Metadata.description<User>(User, "email" as any)); // "Primary email address"
```

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
