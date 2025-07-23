import { AST } from './ast.js';

export function getStringValue(name) {
  // Property names must be strings. This means that non-string objects cannot be used
  // as keys in an object. Any non-string object, including a number, is typecasted
  // into a string via the toString method.
  // -- MDN, https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Property_accessors#Property_names
  return name + '';
}

export function ifDefined(v, d) {
  return typeof v !== 'undefined' ? v : d;
}

export function plusFn(l, r) {
  if (typeof l === 'undefined') return r;
  if (typeof r === 'undefined') return l;
  return l + r;
}

export function isPure(node, parentIsPure) {
  switch (node.type) {
    // Computed members might invoke a stateful toString()
    case 'MemberExpression':
      if (node.computed) {
        return false;
      }
      break;

    // Unary always convert to primative
    case 'UnaryExpression':
      return 1; // PURITY_ABSOLUTE

    // The binary + operator can invoke a stateful toString().
    case 'BinaryExpression':
      return node.operator !== '+' ? 1 : false; // PURITY_ABSOLUTE

    // Functions / filters probably read state from within objects
    case 'CallExpression':
      return false;
  }

  return (undefined === parentIsPure) ? 2 : parentIsPure; // PURITY_RELATIVE
}

export function isAssignable(ast) {
  return ast.type === AST.Identifier || ast.type === AST.MemberExpression;
}

export function isLiteral(ast) {
  return ast.body.length === 0 ||
      ast.body.length === 1 && (
      ast.body[0].expression.type === AST.Literal ||
      ast.body[0].expression.type === AST.ArrayExpression ||
      ast.body[0].expression.type === AST.ObjectExpression);
}

export function isConstant(ast) {
  return ast.constant;
}

export function getValueOf(value) {
  return typeof value.valueOf === "function" ? value.valueOf() : objectValueOf.call(value);
} 