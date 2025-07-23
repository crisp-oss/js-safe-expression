import assert from "assert";

import SafeExpression from "../dist/js-safe-expression.esm.js";

var execute = new SafeExpression();

it("should parse expressions", () => {
  assert.equal(execute("-1")(), -1);
  assert.equal(execute("1 + 2.5")(), 3.5);
  assert.equal(execute("1 - 2.5")(), -1.5);
  assert.equal(execute("1+2*3/4")(), 1 + 2 * 3 / 4);
  assert.equal(execute("0--1+1.5")(), 0 - -1 + 1.5);
  assert.equal(execute("-0--1++2*-3/-4")(), -0 - -1 + +2 * -3 / -4);
  assert.equal(execute("1/2*3")(), 1 / 2 * 3);
});

it("should parse unary", () => {
  assert.equal(execute("+1")(), +1);
  assert.equal(execute("-1")(), -1);
  assert.equal(execute("+\"1\"")(), +"1");
  assert.equal(execute("-\"1\"")(), -"1");
  assert.equal(execute("+undefined")(), 0);
  assert.equal(execute("-undefined")(), 0);
  assert.equal(execute("+null")(), +null);
  assert.equal(execute("-null")(), -null);
  assert.equal(execute("+false")(), +false);
  assert.equal(execute("-false")(), -false);
  assert.equal(execute("+true")(), +true);
  assert.equal(execute("-true")(), -true);
});

it("should parse comparison", function() {
  assert.equal(execute("false")(), false);
  assert.equal(execute("!true")(), false);
  assert.equal(execute("1==1")(), true);
  assert.equal(execute("1==true")(), true);
  assert.equal(execute("1!=true")(), false);
  assert.equal(execute("1===true")(), false);
  assert.equal(execute("1===\"1\"")(), false);
  assert.equal(execute("\"true\"===true")(), false);
  assert.equal(execute("1!==2")(), true);
  assert.equal(execute("1!==\"1\"")(), true);
  assert.equal(execute("1!=2")(), true);
  assert.equal(execute("1<2")(), true);
  assert.equal(execute("1<=1")(), true);
  assert.equal(execute("1>2")(), 1 > 2);
  assert.equal(execute("2>=1")(), 2 >= 1);
  assert.equal(execute("true==2<3")(), true == 2 < 3);
  assert.equal(execute("true===2<3")(), true === 2 < 3);
  assert.equal(execute("true===3===3")(), true === 3 === 3);
  assert.equal(execute("3===3===true")(), 3===3===true);
  assert.equal(execute("3 >= 3 > 2")(), 3 >= 3 > 2);
});

it("should parse logical", function() {
  assert.equal(execute("0&&2")(), 0 && 2);
  assert.equal(execute("0||2")(), 0 || 2);
  assert.equal(execute("0||1&&2")(), 0 || 1 && 2);
  assert.equal(execute("true&&a")(), true && undefined);
  assert.equal(execute("true&&a()")(), true && undefined);
  assert.equal(execute("true&&a()()")(), true && undefined);
  assert.equal(execute("true&&a.b")(), true && undefined);
  assert.equal(execute("true&&a.b.c")(), true && undefined);

  assert.equal(execute("false||a")(), false || undefined);
  assert.equal(execute("false||a()")(), false || undefined);
  assert.equal(execute("false||a()()")(), false || undefined);
  assert.equal(execute("false||a.b")(), false || undefined);
  assert.equal(execute("false||a.b.c")(), false || undefined);
});

it("should parse logical", function() {
  assert.equal(execute("0&&2")(), 0 && 2);
  assert.equal(execute("0||2")(), 0 || 2);
  assert.equal(execute("0||1&&2")(), 0 || 1 && 2);
  assert.equal(execute("true&&a")(), true && undefined);
  assert.equal(execute("true&&a()")(), true && undefined);
  assert.equal(execute("true&&a()()")(), true && undefined);
  assert.equal(execute("true&&a.b")(), true && undefined);
  assert.equal(execute("true&&a.b.c")(), true && undefined);

  assert.equal(execute("false||a")(), false || undefined);
  assert.equal(execute("false||a()")(), false || undefined);
  assert.equal(execute("false||a()()")(), false || undefined);
  assert.equal(execute("false||a.b")(), false || undefined);
  assert.equal(execute("false||a.b.c")(), false || undefined);
});

it("should parse ternary", function() {
  // Simple.
  assert.equal(execute("0?0:2")(), 0 ? 0 : 2);
  assert.equal(execute("1?0:2")(), 1 ? 0 : 2);

  // Nested on the left.
  assert.equal(execute("0?0?0:0:2")(), 0 ? 0 ? 0 : 0 : 2);
  assert.equal(execute("1?0?0:0:2")(), 1 ? 0 ? 0 : 0 : 2);
  assert.equal(execute("0?1?0:0:2")(), 0 ? 1 ? 0 : 0 : 2);
  assert.equal(execute("0?0?1:0:2")(), 0 ? 0 ? 1 : 0 : 2);
  assert.equal(execute("0?0?0:2:3")(), 0 ? 0 ? 0 : 2 : 3);
  assert.equal(execute("1?1?0:0:2")(), 1 ? 1 ? 0 : 0 : 2);
  assert.equal(execute("1?1?1:0:2")(), 1 ? 1 ? 1 : 0 : 2);
  assert.equal(execute("1?1?1:2:3")(), 1 ? 1 ? 1 : 2 : 3);

  // Nested on the right.
  assert.equal(execute("0?0:0?0:2")(), 0 ? 0 : 0 ? 0 : 2);
  assert.equal(execute("1?0:0?0:2")(), 1 ? 0 : 0 ? 0 : 2);
  assert.equal(execute("0?1:0?0:2")(), 0 ? 1 : 0 ? 0 : 2);
  assert.equal(execute("0?0:1?0:2")(), 0 ? 0 : 1 ? 0 : 2);
  assert.equal(execute("0?0:0?2:3")(), 0 ? 0 : 0 ? 2 : 3);
  assert.equal(execute("1?1:0?0:2")(), 1 ? 1 : 0 ? 0 : 2);
  assert.equal(execute("1?1:1?0:2")(), 1 ? 1 : 1 ? 0 : 2);
  assert.equal(execute("1?1:1?2:3")(), 1 ? 1 : 1 ? 2 : 3);
  assert.equal(execute("1?1:1?2:3")(), 1 ? 1 : 1 ? 2 : 3);

  // Precedence with respect to logical operators.
  assert.equal(execute("0&&1?0:1")(), 0 && 1 ? 0 : 1);
  assert.equal(execute("1||0?0:0")(), 1 || 0 ? 0 : 0);
  assert.equal(execute("0?0&&1:2")(), 0 ? 0 && 1 : 2);
  assert.equal(execute("0?0||0:1")(), 0 ? 0 || 0 : 1);
  assert.equal(execute("0?0||1:2")(), 0 ? 0 || 1 : 2);

  assert.equal(execute("1?0&&1:2")(), 1 ? 0 && 1 : 2);
  assert.equal(execute("1?1&&1:2")(), 1 ? 1 && 1 : 2);
  assert.equal(execute("1?0||0:1")(), 1 ? 0 || 0 : 1);
  assert.equal(execute("1?0||1:2")(), 1 ? 0 || 1 : 2);

  assert.equal(execute("0?1:0&&1")(), 0 ? 1 : 0 && 1);
  assert.equal(execute("0?2:1&&1")(), 0 ? 2 : 1 && 1);
  assert.equal(execute("0?1:0||0")(), 0 ? 1 : 0 || 0);
  assert.equal(execute("0?2:0||1")(), 0 ? 2 : 0 || 1);

  assert.equal(execute("1?1:0&&1")(), 1 ? 1 : 0 && 1);
  assert.equal(execute("1?2:1&&1")(), 1 ? 2 : 1 && 1);
  assert.equal(execute("1?1:0||0")(), 1 ? 1 : 0 || 0);
  assert.equal(execute("1?2:0||1")(), 1 ? 2 : 0 || 1);

  var scope = {};

  var returnTrue = scope.returnTrue = function() { return true; };
  var returnFalse = scope.returnFalse = function() { return false; };
  var returnString = scope.returnString = function() { return "asd"; };
  var returnInt = scope.returnInt = function() { return 123; };
  var identity = scope.identity = function(x) { return x; };

  assert.equal(execute("returnTrue() ? returnString() : returnInt()")(scope), returnTrue() ? returnString() : returnInt());
  assert.equal(execute("returnFalse() ? returnString() : returnInt()")(scope), returnFalse() ? returnString() : returnInt());
  assert.equal(execute("returnTrue() ? returnString() : returnInt()")(scope), returnTrue() ? returnString() : returnInt());
  assert.equal(execute("identity(returnFalse() ? returnString() : returnInt())")(scope), identity(returnFalse() ? returnString() : returnInt()));
});

it("should parse string", () => {
  assert.equal(execute("\"a\" + \"b c\"")(), "ab c");
});

it("should access scope", () => {
  var scope = {};

  scope.a =  123;
  scope.b = {c: 456};

  assert.equal(execute("a")(scope), 123);
  assert.equal(execute("b.c")(scope), 456);
  assert.equal(execute("x.y.x")(scope), undefined);
});

it("should handle white-spaces around dots in paths", () => {
  var scope = {};

  scope.a =  {b: 4};

  assert.equal(execute("a . b")(scope), 4);
  assert.equal(execute("a. b")(scope), 4);
  assert.equal(execute("a .b")(scope), 4);
  assert.equal(execute("a    . \nb")(scope), 4);
});

it("should throw syntax error exception for identifiers ending with a dot", function() {
  var scope = {};

  assert.throws(function() {
    return execute("a .", scope)
  }, new Error("Unexpected end of expression: a ."));
});

it("should resolve deeply nested paths (important for CSP mode)", function() {
  var scope = {};

  scope.a = {b: {c: {d: {e: {f: {g: {h: {i: {j: {k: {l: {m: {n: "nooo!"}}}}}}}}}}}}};

  assert.equal(execute("a.b.c.d.e.f.g.h.i.j.k.l.m.n")(scope), "nooo!");
});

it("should be forgiving", function() {
  var scope = {};

  scope.a = {b: 23};
  assert.equal(execute("b")(scope), undefined);
  assert.equal(execute("a.x")(scope), undefined);
  assert.equal(execute("a.b.c.d")(scope), undefined);
  scope.a = undefined;
  assert.equal(execute("a - b")(scope), 0);
  assert.equal(execute("a + b")(scope), undefined);
  scope.a = 0;
  assert.equal(execute("a - b")(scope), 0);
  assert.equal(execute("a + b")(scope), 0);
  scope.a = undefined;
  scope.b = 0;
  assert.equal(execute("a - b")(scope), 0);
  assert.equal(execute("a + b")(scope), 0);
});

it("should support property names that collide with native object properties", function() {
  var scope = {};

  scope.watch = 1;
  scope.toString = function toString() {
    return "custom toString";
  };

  assert.equal(execute("watch")(scope), 1);
  assert.equal(execute("toString()")(scope), "custom toString");
});

it("should not break if the expression is 'hasOwnProperty'", function() {
  var scope = {};

  scope.fooExp = 'barVal';
  // By evaluating hasOwnProperty, the $parse cache will store a getter for
  // the scope's own hasOwnProperty function, which will mess up future cache look ups.
  // i.e. cache['hasOwnProperty'] = function(scope) { return scope.hasOwnProperty; }
  execute("hasOwnProperty");

  assert.equal(execute("fooExp")(scope), "barVal");
});

it("should evaluate grouped expressions", function() {
  var scope = {};

  assert.equal(execute("(1+2)*3")(scope), (1 + 2) * 3);
});

it("should evaluate assignments", function() {
  var scope = {}; 

  assert.equal(execute("a=12")(scope), 12);
  assert.equal(scope.a, 12);

  assert.equal(execute("x.y.z=123;")(scope), 123);
  assert.equal(scope.x.y.z, 123);

  assert.equal(execute("a=123; b=234")(scope), 234);
  assert.equal(scope.x.y.z, 123);
  assert.equal(scope.a, 123);
  assert.equal(scope.b, 234);
});

it("should support optional chaining", function() {
  var context = {
    user: {
      name: 'John',
      address: {
        street: '123 Main St',
        city: 'New York'
      },
      getName: function() { return this.name; }
    },
    nullValue: null,
    undefinedValue: undefined
  };

  // Basic optional chaining
  assert.equal(execute("user?.name")(context), 'John');
  assert.equal(execute("nullValue?.name")(context), undefined);
  assert.equal(execute("undefinedValue?.name")(context), undefined);

  // Nested optional chaining
  assert.equal(execute("user?.address?.street")(context), '123 Main St');
  assert.equal(execute("user?.address?.country")(context), undefined);
  assert.equal(execute("nullValue?.address?.street")(context), undefined);

  // Mixed normal and optional chaining
  assert.equal(execute("user.address?.street")(context), '123 Main St');

  // Optional chaining with computed member access
  assert.equal(execute("user?.[\"name\"]")(context), 'John');
  assert.equal(execute("nullValue?.[\"name\"]")(context), undefined);

  // Optional chaining with method calls
  assert.equal(execute("user?.getName()")(context), 'John');
  assert.equal(execute("nullValue?.getName()")(context), undefined);
});
