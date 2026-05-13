---
title: "TypeScript 类型体操"
date: 2026-05-13
tags:
  - TypeScript
  - 前端基础
sort: 6
summary: 泛型、条件类型、infer、模板字面量类型……TypeScript 的类型系统强大但也容易忘。这篇文章帮你回顾类型体操的核心技巧，以及那些内置工具类型到底是怎么实现的。
---

# TypeScript 类型体操

TypeScript 的类型系统是图灵完备的，这意味着你理论上可以在类型层面做任何计算。当然，日常开发不需要走那么远，但掌握核心的类型编程技巧，确实能让你写出更安全、更具表达力的代码。

这篇文章不会从 `string`、`number` 讲起，而是直接进入那些你可能用过但记不太清细节的部分。

## 泛型与约束

泛型大家都用过，但约束（`extends`）的一些细节值得回顾。

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

这里 `K extends keyof T` 就是约束——`K` 不能是任意字符串，必须是 `T` 的某个键。没有这个约束，`obj[key]` 的返回类型就只能是 `any`。

泛型约束还可以用来做一些有意思的事情，比如让函数只接受特定形状的对象：

```typescript
function merge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  return { ...target, ...source };
}
```

一个容易忽略的点：泛型参数有默认值。

```typescript
type Container<T = string> = {
  value: T;
};

const a: Container = { value: "hello" }; // T 默认是 string
const b: Container<number> = { value: 42 };
```

## 条件类型

条件类型的语法长得像三元表达式：`T extends U ? X : Y`。看起来简单，但它和联合类型组合时会产生分布式行为，这是很多人踩坑的地方。

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false
type C = IsString<string | number>; // true | false，也就是 boolean
```

等一下，`C` 为什么是 `boolean` 而不是 `false`？因为当 `T` 是联合类型时，条件类型会自动分发——对联合的每个成员分别求值，然后把结果合并。`string` 匹配得到 `true`，`number` 不匹配得到 `false`，合起来就是 `true | false`，也就是 `boolean`。

如果你不想要这种分布式行为，用方括号把 `T` 和 `U` 都包起来：

```typescript
type IsStringStrict<T> = [T] extends [string] ? true : false;

type D = IsStringStrict<string | number>; // false
```

## infer 关键字

`infer` 用于在条件类型中"捕获"某个位置的类型。你可以理解为类型层面的模式匹配。

```typescript
type ReturnTypeOf<T> = T extends (...args: unknown[]) => infer R ? R : never;

type R1 = ReturnTypeOf<() => string>; // string
type R2 = ReturnTypeOf<(x: number) => boolean>; // boolean
```

`infer R` 的意思是：如果 `T` 能匹配 `(...args: unknown[]) => R` 这个模式，就把返回值位置的类型"抽"出来赋给 `R`。

`infer` 可以用在很多位置——函数参数、数组元素、Promise 内部类型：

```typescript
// 提取数组元素类型
type ElementOf<T> = T extends (infer E)[] ? E : never;
type E1 = ElementOf<string[]>; // string

// 提取 Promise 包裹的类型
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type P1 = UnwrapPromise<Promise<number>>; // number
type P2 = UnwrapPromise<string>; // string，不是 Promise 就原样返回

// 提取函数第一个参数的类型
type FirstArg<T> = T extends (first: infer F, ...rest: unknown[]) => unknown ? F : never;
type F1 = FirstArg<(name: string, age: number) => void>; // string
```

## 联合类型与交叉类型

联合类型（`|`）和交叉类型（`&`）很基础，但它们在对象类型上的表现容易搞混。

联合类型是"或"——值满足其中一个就行：

```typescript
type Shape = Circle | Rectangle;
// Shape 类型的值要么是 Circle，要么是 Rectangle
```

交叉类型是"且"——值必须同时满足所有类型：

```typescript
type Named = { name: string };
type Aged = { age: number };
type Person = Named & Aged;
// 等价于 { name: string; age: number }
```

但注意，原始类型的交叉可能产生 `never`：

```typescript
type Impossible = string & number; // never
```

还有一个经常让人困惑的点：联合类型在属性访问时只能访问共有属性，交叉类型则可以访问所有属性。

```typescript
type A = { x: number; y: string };
type B = { x: number; z: boolean };

type Union = A | B;
type Inter = A & B;

declare const u: Union;
u.x; // OK，x 是共有属性
// u.y; // 报错，y 不是共有的

declare const i: Inter;
i.x; // OK
i.y; // OK
i.z; // OK
```

## 内置工具类型的实现

TypeScript 自带了一堆工具类型，用起来很方便，但理解它们的实现能帮你写出自己的工具类型。下面逐个过一遍。

### Partial 和 Required

```typescript
// 把所有属性变成可选
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// 把所有属性变成必选（去掉 ?）
type MyRequired<T> = {
  [K in keyof T]-?: T[K];
};
```

`-?` 这个语法有点奇怪，但意思很直白：移除可选修饰符。对应地，还有 `-readonly` 可以移除只读修饰符。

### Pick 和 Omit

```typescript
// 从 T 中挑选指定的属性
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// 从 T 中排除指定的属性
type MyOmit<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P];
};
```

`Omit` 的实现有个小细节：官方的 `Omit` 第二个类型参数是 `K extends keyof any`（也就是 `K extends string | number | symbol`），而不是 `K extends keyof T`。这意味着你可以传入不存在的键名而不报错，这到底算特性还是 bug 一直有争议。上面的写法用了更严格的约束。

### Record

```typescript
type MyRecord<K extends keyof any, V> = {
  [P in K]: V;
};
```

`Record<string, unknown>` 比 `object` 或 `{}` 更精确地表达"任意键值对对象"的意思。

### ReturnType 和 Parameters

```typescript
type MyReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

type MyParameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
```

这两个都用了 `infer`，一个抽返回值，一个抽参数元组。

### Exclude 和 Extract

```typescript
// 从联合类型 T 中排除能赋值给 U 的成员
type MyExclude<T, U> = T extends U ? never : T;

// 从联合类型 T 中提取能赋值给 U 的成员
type MyExtract<T, U> = T extends U ? T : never;
```

这两个是分布式条件类型的经典应用。看个例子：

```typescript
type T1 = MyExclude<"a" | "b" | "c", "a">; // "b" | "c"
type T2 = MyExtract<string | number | boolean, number>; // number
```

### NonNullable

```typescript
type MyNonNullable<T> = T extends null | undefined ? never : T;
```

其实就是 `Exclude<T, null | undefined>` 的快捷方式。

### Readonly

```typescript
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};
```

需要注意的是，`Readonly` 只作用于第一层属性。如果属性值本身是对象，内部属性仍然可以修改。想要深层只读需要递归：

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
```

## 模板字面量类型

TypeScript 4.1 引入的模板字面量类型，让字符串类型也能做运算了。语法和 JavaScript 的模板字符串一样：

```typescript
type Greeting = `Hello, ${string}`;

const a: Greeting = "Hello, World"; // OK
// const b: Greeting = "Hi, World"; // 报错
```

结合联合类型可以生成大量组合：

```typescript
type Color = "red" | "blue" | "green";
type Size = "sm" | "md" | "lg";
type ClassName = `${Color}-${Size}`;
// "red-sm" | "red-md" | "red-lg" | "blue-sm" | "blue-md" | "blue-lg" | "green-sm" | "green-md" | "green-lg"
```

TypeScript 还内置了几个字符串操作类型：

```typescript
type Upper = Uppercase<"hello">; // "HELLO"
type Lower = Lowercase<"HELLO">; // "hello"
type Cap = Capitalize<"hello">; // "Hello"
type Uncap = Uncapitalize<"Hello">; // "hello"
```

一个实际场景——自动推导事件处理器名称：

```typescript
type EventName = "click" | "focus" | "blur";
type HandlerName = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur"
```

模板字面量类型配合 `infer` 还可以做字符串解析：

```typescript
type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<Rest>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type Params = ExtractRouteParams<"/user/:id/post/:postId">;
// "id" | "postId"
```

## 协变与逆变

这部分概念比较学术，但在实际开发中偶尔会碰到。简单说：

- 协变（Covariance）：子类型关系保持方向。`Dog extends Animal`，那么 `Array<Dog>` 也可以赋值给 `Array<Animal>`。大多数类型位置都是协变的。
- 逆变（Contravariance）：子类型关系反转。函数参数位置是逆变的——`(animal: Animal) => void` 可以赋值给 `(dog: Dog) => void`，反过来不行。

```typescript
class Animal {
  name = "";
}
class Dog extends Animal {
  breed = "";
}

// 协变：返回值位置
type Producer<T> = () => T;
const produceDog: Producer<Dog> = () => new Dog();
const produceAnimal: Producer<Animal> = produceDog; // OK

// 逆变：参数位置（strictFunctionTypes 开启时）
type Consumer<T> = (item: T) => void;
const consumeAnimal: Consumer<Animal> = (a) => console.log(a.name);
// const consumeDog: Consumer<Dog> = consumeAnimal; // strictFunctionTypes 下报错
```

为什么要关心这个？因为当你写泛型类型时，类型参数出现在不同位置会影响类型兼容性。如果搞不清楚为什么某个赋值报错了，可能就是协变逆变的问题。

详细内容可以参考 [TypeScript 官方文档关于类型兼容性的章节](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)。

## type vs interface

这个问题被问了无数遍了，但很多回答不够准确。说说真正的区别：

两者都能描述对象的形状，而且大多数场景下可以互换。但有几个关键差异：

interface 支持声明合并（Declaration Merging），type 不行：

```typescript
interface User {
  name: string;
}
interface User {
  age: number;
}
// 两个声明会合并，User 同时有 name 和 age

type Point = { x: number };
// type Point = { y: number }; // 报错：重复标识符
```

这个特性在扩展第三方库的类型定义时特别有用。

type 能做的事情更多——联合类型、交叉类型、条件类型、映射类型都只能用 type：

```typescript
type StringOrNumber = string | number; // interface 做不到
type Nullable<T> = T | null; // interface 做不到
type Keys = keyof SomeType; // interface 做不到
```

interface 只能描述对象和函数的形状，type 是真正的类型别名，可以给任何类型起名字。

性能方面，TypeScript 编译器对 interface 有缓存优化，在大量使用交叉类型（`&`）时 interface 的 `extends` 通常表现更好。不过在绝大多数项目中这个差异可以忽略。

所以实践建议：描述对象形状优先用 interface（尤其是要被扩展的 API 类型），其他场景用 type。不必纠结太多，保持项目内一致就好。

## 实用类型编程技巧

### 用 as const 收窄字面量类型

```typescript
const routes = ["home", "about", "contact"] as const;
type Route = (typeof routes)[number]; // "home" | "about" | "contact"
```

不加 `as const` 的话，`routes` 的类型是 `string[]`，联合类型就提取不出来了。

### 用 satisfies 兼顾类型检查和类型推断

```typescript
type Config = Record<string, { url: string; timeout?: number }>;

const config = {
  api: { url: "https://api.example.com", timeout: 5000 },
  cdn: { url: "https://cdn.example.com" },
} satisfies Config;

// config.api.timeout 的类型是 number（不是 number | undefined）
// 因为 satisfies 保留了字面量推断的精度
```

如果直接用 `const config: Config = ...`，`config.api.timeout` 的类型就变成 `number | undefined` 了，丢失了精度。

### 用映射类型做键名变换

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

`as` 子句（TypeScript 4.1+）可以在映射类型中重命名键，结合模板字面量类型非常强大。

### 用递归类型处理嵌套结构

```typescript
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
```

TypeScript 支持类型的递归引用，很适合描述 JSON、树形结构这类嵌套数据。

### 用函数重载 + 条件类型实现精确返回

```typescript
function parse<T extends "string" | "number">(
  value: string,
  type: T
): T extends "string" ? string : number;
function parse(value: string, type: "string" | "number"): string | number {
  return type === "string" ? value : Number(value);
}

const s = parse("42", "string"); // string
const n = parse("42", "number"); // number
```

### 用 NoInfer 阻止类型推断

TypeScript 5.4 引入了 [NoInfer](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html#the-noinfer-utility-type) 工具类型，可以阻止某个位置参与类型推断：

```typescript
function createFSM<S extends string>(config: {
  initial: NoInfer<S>;
  states: S[];
}) {
  return config;
}

// states 推断出 S = "idle" | "loading" | "done"
// initial 被 NoInfer 包裹，不参与推断，但会被检查是否符合 S
createFSM({
  initial: "idle",
  states: ["idle", "loading", "done"],
});
```

## 小结

TypeScript 的类型系统远比大多数人日常使用的部分要丰富。泛型和条件类型是基础，`infer` 是做类型提取的核心工具，映射类型和模板字面量类型让你能批量生成和变换类型。

不过话说回来，类型体操不是炫技的工具。如果一个类型写出来连作者自己都看不懂，那它大概率是过度设计了。好的类型应该让代码更容易理解，而不是更难。

想深入练习的话，推荐去 [type-challenges](https://github.com/type-challenges/type-challenges) 刷题，从 easy 到 extreme 都有，能把这些概念真正内化。TypeScript 官方的 [Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) 也值得时不时翻一翻，尤其是 [类型操作](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html) 这部分。
