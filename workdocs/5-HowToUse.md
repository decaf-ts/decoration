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
