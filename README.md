# js-safe-expression

[![NPM](https://img.shields.io/npm/v/safe-expression.svg)](https://www.npmjs.com/package/safe-expression) [![Downloads](https://img.shields.io/npm/dt/safe-expression.svg)](https://www.npmjs.com/package/safe-expression) 

A lightweight, CSP-safe and fast javascript expression parser/executor. The main usage for this project is to execute javascript code without using eval or Function. It is built on the top of the AngularJS 1 internal lexer/parser. It compiles & executes javascript strings using a provided scope such as `"1+1"` or `"context.call_a_function()"`, `"value = 'foo"`, `"value === 'foo'"`

This project can run on websites having a strict CSP policy and can be easily plugged on the top on frameworks such as Petite-Vue, AlpineJS, Preact.

The code is 19KB when minified and 5KB once gzipped

## How to use?

Import the module in your code:

`var SafeExpression = require("safe-expression");`

```javascript

let myInvoice = new MicroInvoice({
  // Use example from examples/index.js
});
// Render invoice as PDF
myInvoice.generate("example.pdf").then(() => {
  console.log("Invoice saved");
});

```

## Caveats

- It is currently supporting `++` and `--` operators, so use `test = test + 1` instead of `test++`
- Operands are not possible in function calls. For instance, `context.call_a_function(index + 1)` will execute `context.call_a_function(index)`

## Notes about the autorship

This code is made from an extract of [AngularJS's parser](https://github.com/angular/angular.js/blob/e29900c78f8fa962559b1cf95e1e7d428230e645/src/ng/parse.js).

The main different with the original code is we changed all AngularJS internals so it can run as a standalone library, without embedding the rest of AngularJS.

Some AngularJS specific features got removed such as filters and watchers so it can work with a VanillaJS syntac