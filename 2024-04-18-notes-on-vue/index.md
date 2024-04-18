# Notes on Vue from a React dev

Coming from a background as a JavaScript (or more accurately, TypeScript) developer, there are a lot of things in Vue that seem smart, some that seem weird, and some that seem outright wrong. These are my notes on transitioning from a long history of React usage to developing in Vue (specifically using the Single File Components flavor, as that seems to be the modern approach).

## The good: simplicity and power

### Native scoped styles

Vue provides native support for [scoped styling](https://vuejs.org/api/sfc-css-features.html#scoped-css). You simply define `<style scoped>` instead of `<style>` in your SFC, and Vue will automatically transform all CSS selectors such that they only target elements rendered by the component.

In practice, this is done by adding an attribute - let's say `data-v-123456` - to all elements rendered by a component. Selectors can then have `[data-v-123456]` added to each entry in them, to make sure they don't affect other elements. This is unlike e.g. CSS modules where classes are transformed into unique strings - a common solution for scoped styles in React codebases - in that they don't require manual handling. Everything Just Works™️, and is readily transparent when looking at the compiled output:

```css
/* original CSS */
.example {
  color: red;
}
```

```css
/* compiled scoped CSS from Vue's <style scoped> */
.example[data-v-123456] {
  color: red;
}
```

```css
/* compiled scoped CSS from CSS modules */
._foo_1829j_1 {
  color: red;
}
```

Personally, I love this approach. It's the [same approach taken by Astro](https://docs.astro.build/en/guides/styling/#scoped-styles), a framework I consider to be a near-ideal midpoint between Vue and React syntax-wise, and it not only simplifies the mental model for styling compared to CSS modules or CSS-in-JS, but is also relatively side-effect free and easy to debug.

## The weird: Vue DSLs

### Statements that aren't statements

While logic in your templates should be kept to a minimum, it is still sometimes needed. Things like for loops, if statements and conditional rendering have to be supported somehow. In JSX, this is done by breaking out into plain JavaScript:

```jsx
<div>
  {data.map((entry,i) => <span>Entry {i}: {entry}</span>)}
</div>
```

This is somewhat verbose (especially as it starts becoming nested), but it is also very intuitive if you're used to developing in JavaScript.  
In Vue, this has been simplified down to a Vue-specific Domain Specific Language using its [built-in directives](https://vuejs.org/api/built-in-directives.html):

```vue
<div>
  <span v-for="(entry, i) in data">
    Entry {{i}}: {{entry}}
  </span>
</div>
```

I'm not against this at all. The JSX way becomes ugly *very* quickly, and trying to solve that can only be applauded. However, introducing a whole new DSL means a lot of new questions while coding. For example:

- What is the scoping of the `v-for` directive?
- What happens if I want to access directive data (or branch the `v-if`/`v-else-if`/`v-else` directives) at different depths in the DOM tree?
- What interface does `v-for` use to iterate through items in the collection given to it - and how do I access metavariables like the iterator or collection?
- How does `v-show`/`v-if`/`v-else-if` convert its passed value to a true/false statement - can I trust that it acts exactly like I'm used to in JavaScript?

Usually the answer to those questions makes sense - the designers behind Vue have done a great job - but it still requires me to look it up _every time_, until I learn this new language and its specifics.

### Attributes are automatically passed - unless they aren't

When writing components, you'll often find yourself implementing thin wrappers around other components. This usually means that your component should take the same props as the underlying component (presumably with some modifications), and pass them to it as needed. In React, this is done explicitly:

```jsx
type Props = React.ComponentProps<typeof UnderlyingComponent> & {
  additionalProp: string,
};

export const WrapperComponent = ({ additionalProp, ...passthrough }: Props) => {
  return <UnderlyingComponent {...pasthrough}>
    The wrapper was passed {additionalProp}
  </UnderlyingComponent>
}
```

In Vue, this is (usually) implemented using [fallthrough props](https://vuejs.org/guide/components/attrs#fallthrough-attributes) - that is, it happens automatically. If your wrapper component only renders a single direct child, that child automatically receives e.g. the `class` attribute given to the parent, and its rendered value is automatically merged:

```vue
<template>
  <!-- This... just receives the fallthrough attributes? I hope? -->
  <UnderlyingComponent />
</template>
```

While this is nice when it works, it is frustratingly implicit and unintuitive to work with when it doesn't. In those cases you almost always have to break out into explicit handling of attributes, forcing you to learn how Vue _actually_ handles passthrough props - in which case you could've just as well started with that. For example:

- What attributes are fallthrough attributes? Can I trust that all the properties expected of the underlying component are given to it, or do I have to manually do some work - and how do I know that before encountering a failing render?
- If I'm rendering a component that doesn't support one of the fallthrough, how do I stop the fallthrough from happening, either for all attributes or just for the one that it doesn't support?
- If I want to modify one of the fallthrough attributes, how do I do that, and am I sure that it won't be "automatically merged" by Vue with the original value?
- How does this interact with TypeScript typing? Can I be sure of the details of how that works? Can I modify it?

## The bad: breaking with the system

While [React is "just JavaScript"](https://daverupert.com/2018/06/the-react-is-just-javascript-myth/), Vue is definitely not. Vue's ecosystem encapsulates a lot of things, choosing to use a compiler to translate a custom-made language into the HTML, CSS and JS needed to render them in a browser. This comes with a lot of positives (as mentioned above), but also a few weird things that you'll have to learn that are just The Vue Way™️. These include:

### Functions that aren't functions

Vue uses [compiler macros](https://vuejs.org/glossary/#compiler-macro) to type the exports of your components. These are function-like expressions that are removed at compile-time, used solely for communicating typing information:

```vue
<script setup>
// define what props are available (and type check them)
const props = defineProps({
  foo: String
});

// define what event names we expose (but not what they look like, using this flavor)
const emit = defineEmits(["change", "delete"]);
</script>
```
[Source](https://vuejs.org/api/sfc-script-setup#defineprops-defineemits)

These look exactly like normal JavaScript functions - but they aren't. You don't have any underlying code you can easily dive into, and you don't have any imports of them (which might ring a few alarm bells if you have any experience with properly typed module systems). This confusion is intentional:

> These macros are intentionally designed to look like normal JavaScript functions so that they can leverage the same parser and type inference tooling around JavaScript / TypeScript. However, they are not actual functions that are run in the browser. These are special strings that the compiler detects and replaces with the real JavaScript code that will actually be run. [Source](https://vuejs.org/glossary/#compiler-macro)

While I can definitely understand the rationale behind it, the abuse of JavaScript syntax to mostly-but-not-quite act like functions seems like one of the worse solutions they could've picked. Using TypeScript-native syntax like other frameworks do (e.g. `export type Props = { foo: string }`) solves the same problem without the confusion.

### Strings that aren't strings

In JSX, you break out into JavaScript using curly brackets. There is no magic beyond that - functions are functions, variables are variables, and everything acts as you expect:

```jsx
const myVariable = "bar";
const onClick = () => alert("You clicked something");

return <button data-foo={myVariable} data-foo-source="myVariable" onClick={onClick} onPointer={() => alert("You tapped something")}>
  I am a button with data-foo={ myVariable }
</button>
```

In Vue, you break out into JavaScript using one of the many directives that expect JavaScript to be passed to it (commonly `v-bind`/`:` and `v-on`/`@`). Vue attempts to detect automatically whether you're referencing a variable, modifying a variable, or executing arbitrary code - and everything happens inside double quotes as if though it was strings:

```vue
<script setup lang="ts">
const myVariable = "bar";
const onClick = () => alert("You clicked something");
</script>
<template>
  <button :data-foo="myVariable" data-foo-source="myVariable" @click="onClick" @pointer="alert('You tapped something')">
    I am a button with data-foo={{ myVariable }}
  </button>
</template>
```

While this can be considered just another Vue-specific DSL (and I'm sure I'll get used to it eventually), it's a particularly egregious example of one. It's unintuitive, and its attempt to guess at what you intend feels ambiguous and unnecessary - a lot like JavaScript's automatic type conversion, that was originally implemented in an attempt to make it beginner friendly.
