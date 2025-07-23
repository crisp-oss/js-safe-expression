import { LITERALS } from './constants.js';
import { isAssignable } from './utils.js';

export class AST {
  constructor(lexer, options) {
    this.lexer = lexer;
    this.options = options;
  }

  static Program = 'Program';
  static ExpressionStatement = 'ExpressionStatement';
  static AssignmentExpression = 'AssignmentExpression';
  static ConditionalExpression = 'ConditionalExpression';
  static LogicalExpression = 'LogicalExpression';
  static BinaryExpression = 'BinaryExpression';
  static UnaryExpression = 'UnaryExpression';
  static CallExpression = 'CallExpression';
  static MemberExpression = 'MemberExpression';
  static Identifier = 'Identifier';
  static Literal = 'Literal';
  static ArrayExpression = 'ArrayExpression';
  static Property = 'Property';
  static ObjectExpression = 'ObjectExpression';
  static ThisExpression = 'ThisExpression';
  static LocalsExpression = 'LocalsExpression';
  static NGValueParameter = 'NGValueParameter';

  ast(text) {
    this.text = text;
    this.tokens = this.lexer.lex(text);
    const value = this.program();

    if (this.tokens.length !== 0) {
      this.throwError('is an unexpected token', this.tokens[0]);
    }

    return value;
  }

  program() {
    const body = [];
    while (true) {
      if (this.tokens.length > 0 && !this.peek('}', ')', ';', ']'))
        body.push(this.expressionStatement());
      if (!this.expect(';')) {
        return { type: AST.Program, body: body};
      }
    }
  }

  expressionStatement() {
    return { type: AST.ExpressionStatement, expression: this.expression() };
  }

  expression() {
    return this.assignment();
  }

  assignment() {
    const result = this.ternary();
    if (this.expect('=')) {
      if (!isAssignable(result)) {
        throw new Error('Trying to assign a value to a non l-value');
      }

      return { 
        type: AST.AssignmentExpression, 
        left: result, 
        right: this.assignment(), 
        operator: '='
      };
    }
    return result;
  }

  ternary() {
    const test = this.logicalOR();
    let alternate;
    let consequent;
    if (this.expect('?')) {
      alternate = this.expression();
      if (this.consume(':')) {
        consequent = this.expression();
        return { 
          type: AST.ConditionalExpression, 
          test: test, 
          alternate: alternate, 
          consequent: consequent
        };
      }
    }
    return test;
  }

  logicalOR() {
    let left = this.logicalAND();
    while (this.expect('||')) {
      left = { 
        type: AST.LogicalExpression, 
        operator: '||', 
        left: left, 
        right: this.logicalAND() 
      };
    }
    return left;
  }

  logicalAND() {
    let left = this.equality();
    while (this.expect('&&')) {
      left = { 
        type: AST.LogicalExpression, 
        operator: '&&', 
        left: left, 
        right: this.equality()
      };
    }
    return left;
  }

  equality() {
    let left = this.relational();
    let token;
    while ((token = this.expect('==','!=','===','!=='))) {
      left = { 
        type: AST.BinaryExpression, 
        operator: token.text, 
        left: left, 
        right: this.relational() 
      };
    }
    return left;
  }

  relational() {
    let left = this.additive();
    let token;
    while ((token = this.expect('<', '>', '<=', '>='))) {
      left = { 
        type: AST.BinaryExpression, 
        operator: token.text, 
        left: left, 
        right: this.additive() 
      };
    }
    return left;
  }

  additive() {
    let left = this.multiplicative();
    let token;
    while ((token = this.expect('+','-'))) {
      left = { 
        type: AST.BinaryExpression, 
        operator: token.text, 
        left: left, 
        right: this.multiplicative() 
      };
    }
    return left;
  }

  multiplicative() {
    let left = this.unary();
    let token;
    while ((token = this.expect('*','/','%'))) {
      left = { 
        type: AST.BinaryExpression, 
        operator: token.text, 
        left: left, 
        right: this.unary() 
      };
    }
    return left;
  }

  unary() {
    let token;
    if ((token = this.expect('+', '-', '!'))) {
      return { 
        type: AST.UnaryExpression, 
        operator: token.text, 
        prefix: true, 
        argument: this.unary() 
      };
    } else {
      return this.primary();
    }
  }

  primary() {
    let primary;
    if (this.expect('(')) {
      primary = this.expression();
      this.consume(')');
    } else if (this.expect('[')) {
      primary = this.arrayDeclaration();
    } else if (this.expect('{')) {
      primary = this.object();
    } else if (this.selfReferential.hasOwnProperty(this.peek().text)) {
      primary = Object.assign({}, this.selfReferential[this.consume().text]);
    } else if (LITERALS.hasOwnProperty(this.peek().text)) {
      primary = { type: AST.Literal, value: LITERALS[this.consume().text]};
    } else if (this.peek().identifier) {
      primary = this.identifier();
    } else if (this.peek().constant) {
      primary = this.constant();
    } else {
      this.throwError('not a primary expression', this.peek());
    }

    let next;
    while ((next = this.expect('(', '[', '.', '?.'))) {
      if (next.text === '(') {
        primary = {
          type: AST.CallExpression, 
          callee: primary, 
          arguments: this.parseArguments() 
        };
        this.consume(')');
      } else if (next.text === '[') {
        primary = { 
          type: AST.MemberExpression, 
          object: primary, 
          property: this.expression(), 
          computed: true 
        };
        this.consume(']');
      } else if (next.text === '.') {
        primary = { 
          type: AST.MemberExpression, 
          object: primary, 
          property: this.identifier(), 
          computed: false 
        };
      } else if (next.text === '?.') {
        if (this.peek('[')) {
          this.consume('[');
          primary = { 
            type: AST.MemberExpression, 
            object: primary, 
            property: this.expression(), 
            computed: true, 
            optional: true 
          };
          this.consume(']');
        } else {
          primary = { 
            type: AST.MemberExpression, 
            object: primary, 
            property: this.identifier(), 
            computed: false, 
            optional: true 
          };
        }
      }
    }
    return primary;
  }

  parseArguments() {
    const args = [];
    if (this.peekToken().text !== ')') {
      do {
        args.push(this.expression());
      } while (this.expect(','));
    }
    return args;
  }

  identifier() {
    const token = this.consume();
    if (!token.identifier) {
      this.throwError('is not a valid identifier', token);
    }
    return { type: AST.Identifier, name: token.text };
  }

  constant() {
    return { type: AST.Literal, value: this.consume().value };
  }

  arrayDeclaration() {
    const elements = [];
    if (this.peekToken().text !== ']') {
      do {
        if (this.peek(']')) {
          break;
        }
        elements.push(this.expression());
      } while (this.expect(','));
    }
    this.consume(']');

    return { type: AST.ArrayExpression, elements: elements };
  }

  object() {
    const properties = [];
    let property;
    if (this.peekToken().text !== '}') {
      do {
        if (this.peek('}')) {
          break;
        }
        property = {type: AST.Property, kind: 'init'};
        if (this.peek().constant) {
          property.key = this.constant();
          property.computed = false;
          this.consume(':');
          property.value = this.expression();
        } else if (this.peek().identifier) {
          property.key = this.identifier();
          property.computed = false;
          if (this.peek(':')) {
            this.consume(':');
            property.value = this.expression();
          } else {
            property.value = property.key;
          }
        } else if (this.peek('[')) {
          this.consume('[');
          property.key = this.expression();
          this.consume(']');
          property.computed = true;
          this.consume(':');
          property.value = this.expression();
        } else {
          this.throwError('invalid key', this.peek());
        }
        properties.push(property);
      } while (this.expect(','));
    }
    this.consume('}');

    return {type: AST.ObjectExpression, properties: properties };
  }

  throwError(msg, token) {
    throw new Error(
      `Syntax Error: Token '${token.text}' ${msg} at column ${token.index + 1} of the expression [${this.text}] starting at [${this.text.substring(token.index)}].`
    );
  }

  consume(e1) {
    if (this.tokens.length === 0) {
      throw new Error(`Unexpected end of expression: ${this.text}`);
    }

    const token = this.expect(e1);
    if (!token) {
      this.throwError('is unexpected, expecting [' + e1 + ']', this.peek());
    }
    return token;
  }

  peekToken() {
    if (this.tokens.length === 0) {
      throw new Error(`Unexpected end of expression: ${this.text}`);
    }
    return this.tokens[0];
  }

  peek(e1, e2, e3, e4) {
    return this.peekAhead(0, e1, e2, e3, e4);
  }

  peekAhead(i, e1, e2, e3, e4) {
    if (this.tokens.length > i) {
      const token = this.tokens[i];
      const t = token.text;
      if (t === e1 || t === e2 || t === e3 || t === e4 ||
          (!e1 && !e2 && !e3 && !e4)) {
        return token;
      }
    }
    return false;
  }

  expect(e1, e2, e3, e4) {
    const token = this.peek(e1, e2, e3, e4);
    if (token) {
      this.tokens.shift();
      return token;
    }
    return false;
  }

  selfReferential = {
    'this': {type: AST.ThisExpression },
    '$locals': {type: AST.LocalsExpression }
  }
} 