import { AST } from './ast.js';
import { plusFn, isPure, isAssignable, getStringValue } from './utils.js';

function findConstantAndWatchExpressions(ast, parentIsPure) {
  let allConstants;
  let argsToWatch;

  const astIsPure = ast.isPure = isPure(ast, parentIsPure);

  switch (ast.type) {
    case AST.Program:
      allConstants = true;
      ast.body.forEach(function(expr) {
        findConstantAndWatchExpressions(expr.expression, astIsPure);
        allConstants = allConstants && expr.expression.constant;
      });
      ast.constant = allConstants;
      break;
    case AST.Literal:
      ast.constant = true;
      ast.toWatch = [];
      break;
    case AST.UnaryExpression:
      findConstantAndWatchExpressions(ast.argument, astIsPure);
      ast.constant = ast.argument.constant;
      ast.toWatch = ast.argument.toWatch;
      break;
    case AST.BinaryExpression:
      findConstantAndWatchExpressions(ast.left, astIsPure);
      findConstantAndWatchExpressions(ast.right, astIsPure);
      ast.constant = ast.left.constant && ast.right.constant;
      ast.toWatch = ast.left.toWatch.concat(ast.right.toWatch);
      break;
    case AST.LogicalExpression:
      findConstantAndWatchExpressions(ast.left, astIsPure);
      findConstantAndWatchExpressions(ast.right, astIsPure);
      ast.constant = ast.left.constant && ast.right.constant;
      ast.toWatch = ast.constant ? [] : [ast];
      break;
    case AST.ConditionalExpression:
      findConstantAndWatchExpressions(ast.test, astIsPure);
      findConstantAndWatchExpressions(ast.alternate, astIsPure);
      findConstantAndWatchExpressions(ast.consequent, astIsPure);
      ast.constant = ast.test.constant && ast.alternate.constant && ast.consequent.constant;
      ast.toWatch = ast.constant ? [] : [ast];
      break;
    case AST.Identifier:
      ast.constant = false;
      ast.toWatch = [ast];
      break;
    case AST.MemberExpression:
      findConstantAndWatchExpressions(ast.object, astIsPure);
      if (ast.computed) {
        findConstantAndWatchExpressions(ast.property, astIsPure);
      }
      ast.constant = ast.object.constant && (!ast.computed || ast.property.constant);
      ast.toWatch = ast.constant ? [] : [ast];
      break;
    case AST.CallExpression:
      allConstants = false;
      argsToWatch = [];
      ast.arguments.forEach(function(expr) {
        findConstantAndWatchExpressions(expr, astIsPure);
        allConstants = allConstants && expr.constant;
        argsToWatch.push.apply(argsToWatch, expr.toWatch);
      });
      ast.constant = allConstants;
      ast.toWatch = [ast];
      break;
    case AST.AssignmentExpression:
      findConstantAndWatchExpressions(ast.left, astIsPure);
      findConstantAndWatchExpressions(ast.right, astIsPure);
      ast.constant = ast.left.constant && ast.right.constant;
      ast.toWatch = [ast];
      break;
    case AST.ArrayExpression:
      allConstants = true;
      argsToWatch = [];
      ast.elements.forEach(function(expr) {
        findConstantAndWatchExpressions(expr, astIsPure);
        allConstants = allConstants && expr.constant;
        argsToWatch.push.apply(argsToWatch, expr.toWatch);
      });
      ast.constant = allConstants;
      ast.toWatch = argsToWatch;
      break;
    case AST.ObjectExpression:
      allConstants = true;
      argsToWatch = [];
      ast.properties.forEach(function(property) {
        findConstantAndWatchExpressions(property.value, astIsPure);
        allConstants = allConstants && property.value.constant;
        argsToWatch.push.apply(argsToWatch, property.value.toWatch);
        if (property.computed) {
          findConstantAndWatchExpressions(property.key, false);
          allConstants = allConstants && property.key.constant;
          argsToWatch.push.apply(argsToWatch, property.key.toWatch);
        }
      });
      ast.constant = allConstants;
      ast.toWatch = argsToWatch;
      break;
    case AST.ThisExpression:
      ast.constant = false;
      ast.toWatch = [];
      break;
    case AST.LocalsExpression:
      ast.constant = false;
      ast.toWatch = [];
      break;
  }
}

function getInputs(body) {
  if (body.length !== 1) return;
  const lastExpression = body[0].expression;

  const candidate = lastExpression.toWatch;
  if (candidate.length !== 1) return candidate;
  return candidate[0] !== lastExpression ? candidate : undefined;
}

function assignableAST(ast) {
  if (ast.body.length === 1 && isAssignable(ast.body[0].expression)) {
    return {
      type: AST.AssignmentExpression,
      left: ast.body[0].expression,
      right: {type: AST.NGValueParameter},
      operator: '='
    };
  }
}

export class ASTInterpreter {
  compile(ast) {
    const self = this;
    findConstantAndWatchExpressions(ast);
    let assignable;
    let assign;
    if ((assignable = assignableAST(ast))) {
      assign = this.recurse(assignable);
    }
    const toWatch = getInputs(ast.body);
    let inputs;
    if (toWatch) {
      inputs = [];
      toWatch.forEach(function(watch, key) {
        const input = self.recurse(watch);
        input.isPure = watch.isPure;
        watch.input = input;
        inputs.push(input);
        watch.watchId = key;
      });
    }
    const expressions = [];
    ast.body.forEach(function(expression) {
      expressions.push(self.recurse(expression.expression));
    });
    const fn = ast.body.length === 0 ? noop :
             ast.body.length === 1 ? expressions[0] :
             function(scope, locals) {
               let lastValue;
               expressions.forEach(function(exp) {
                 lastValue = exp(scope, locals);
               });
               return lastValue;
             };
    if (assign) {
      fn.assign = function(scope, value, locals) {
        return assign(scope, locals, value);
      };
    }
    if (inputs) {
      fn.inputs = inputs;
    }
    return fn;
  }

  recurse(ast, context, create) {
    let left, right, self = this, args;
    if (ast.input) {
      return this.inputs(ast.input, ast.watchId);
    }
    switch (ast.type) {
      case AST.Literal:
        return this.value(ast.value, context);
      case AST.UnaryExpression:
        right = this.recurse(ast.argument);
        return this['unary' + ast.operator](right, context);
      case AST.BinaryExpression:
        left = this.recurse(ast.left);
        right = this.recurse(ast.right);
        return this['binary' + ast.operator](left, right, context);
      case AST.LogicalExpression:
        left = this.recurse(ast.left);
        right = this.recurse(ast.right);
        return this['binary' + ast.operator](left, right, context);
      case AST.ConditionalExpression:
        return this['ternary?:'](
          this.recurse(ast.test),
          this.recurse(ast.alternate),
          this.recurse(ast.consequent),
          context
        );
      case AST.Identifier:
        return self.identifier(ast.name, context, create);
      case AST.MemberExpression:
        left = this.recurse(ast.object, false, !!create);
        if (!ast.computed) {
          right = ast.property.name;
        }
        if (ast.computed) right = this.recurse(ast.property);
        return ast.computed ?
          this.computedMember(left, right, context, create, ast.optional) :
          this.nonComputedMember(left, right, context, create, ast.optional);
      case AST.CallExpression:
        args = [];
        ast.arguments.forEach(function(expr) {
          args.push(self.recurse(expr));
        });
        right = this.recurse(ast.callee, true);
        return function(scope, locals, assign, inputs) {
          const rhs = right(scope, locals, assign, inputs);
          let value;
          if (rhs.value != null) {
            const values = [];
            for (let i = 0; i < args.length; ++i) {
              values.push(args[i](scope, locals, assign, inputs));
            }
            value = rhs.value.apply(rhs.context, values);
          }
          return context ? {value: value} : value;
        };
      case AST.AssignmentExpression:
        left = this.recurse(ast.left, true, 1);
        right = this.recurse(ast.right);
        return function(scope, locals, assign, inputs) {
          const lhs = left(scope, locals, assign, inputs);
          const rhs = right(scope, locals, assign, inputs);
          lhs.context[lhs.name] = rhs;
          return context ? {value: rhs} : rhs;
        };
      case AST.ArrayExpression:
        args = [];
        ast.elements.forEach(function(expr) {
          args.push(self.recurse(expr));
        });
        return function(scope, locals, assign, inputs) {
          const value = [];
          for (let i = 0; i < args.length; ++i) {
            value.push(args[i](scope, locals, assign, inputs));
          }
          return context ? {value: value} : value;
        };
      case AST.ObjectExpression:
        args = [];
        ast.properties.forEach(function(property) {
          if (property.computed) {
            args.push({
              key: self.recurse(property.key),
              computed: true,
              value: self.recurse(property.value)
            });
          } else {
            args.push({
              key: property.key.type === AST.Identifier ?
                   property.key.name :
                   ('' + property.key.value),
              computed: false,
              value: self.recurse(property.value)
            });
          }
        });
        return function(scope, locals, assign, inputs) {
          const value = {};
          for (let i = 0; i < args.length; ++i) {
            if (args[i].computed) {
              value[args[i].key(scope, locals, assign, inputs)] = args[i].value(scope, locals, assign, inputs);
            } else {
              value[args[i].key] = args[i].value(scope, locals, assign, inputs);
            }
          }
          return context ? {value: value} : value;
        };
      case AST.ThisExpression:
        return function(scope) {
          return context ? {value: scope} : scope;
        };
      case AST.LocalsExpression:
        return function(scope, locals) {
          return context ? {value: locals} : locals;
        };
      case AST.NGValueParameter:
        return function(scope, locals, assign) {
          return context ? {value: assign} : assign;
        };
    }
  }

  ['unary+'](argument, context) {
    return function(scope, locals, assign, inputs) {
      let arg = argument(scope, locals, assign, inputs);
      if (typeof arg !== "undefined") {
        arg = +arg;
      } else {
        arg = 0;
      }
      return context ? {value: arg} : arg;
    };
  }

  ['unary-'](argument, context) {
    return function(scope, locals, assign, inputs) {
      let arg = argument(scope, locals, assign, inputs);
      if (typeof arg !== "undefined") {
        arg = -arg;
      } else {
        arg = -0;
      }
      return context ? {value: arg} : arg;
    };
  }

  ['unary!'](argument, context) {
    return function(scope, locals, assign, inputs) {
      const arg = !argument(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  ['binary+'](left, right, context) {
    return function(scope, locals, assign, inputs) {
      const lhs = left(scope, locals, assign, inputs);
      const rhs = right(scope, locals, assign, inputs);
      const arg = plusFn(lhs, rhs);
      return context ? {value: arg} : arg;
    };
  }

  ['binary-'](left, right, context) {
    return function(scope, locals, assign, inputs) {
      const lhs = left(scope, locals, assign, inputs);
      const rhs = right(scope, locals, assign, inputs);
      const arg = (typeof lhs !== "undefined" ? lhs : 0) - (typeof rhs !== "undefined"? rhs : 0);
      return context ? {value: arg} : arg;
    };
  }

  ['binary*'](left, right, context) {
    return function(scope, locals, assign, inputs) {
      const arg = left(scope, locals, assign, inputs) * right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  ['binary/'](left, right, context) {
    return function(scope, locals, assign, inputs) {
      const arg = left(scope, locals, assign, inputs) / right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  ['binary%'](left, right, context) {
    return function(scope, locals, assign, inputs) {
      const arg = left(scope, locals, assign, inputs) % right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  ['binary==='](left, right, context) {
    return function(scope, locals, assign, inputs) {
      const arg = left(scope, locals, assign, inputs) === right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  ['binary!=='](left, right, context) {
    return function(scope, locals, assign, inputs) {
      const arg = left(scope, locals, assign, inputs) !== right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  ['binary=='](left, right, context) {
    return function(scope, locals, assign, inputs) {
      // eslint-disable-next-line eqeqeq
      const arg = left(scope, locals, assign, inputs) == right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  ['binary!='](left, right, context) {
    return function(scope, locals, assign, inputs) {
      // eslint-disable-next-line eqeqeq
      const arg = left(scope, locals, assign, inputs) != right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  ['binary<'](left, right, context) {
    return function(scope, locals, assign, inputs) {
      const arg = left(scope, locals, assign, inputs) < right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  ['binary>'](left, right, context) {
    return function(scope, locals, assign, inputs) {
      const arg = left(scope, locals, assign, inputs) > right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  ['binary<='](left, right, context) {
    return function(scope, locals, assign, inputs) {
      const arg = left(scope, locals, assign, inputs) <= right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  ['binary>='](left, right, context) {
    return function(scope, locals, assign, inputs) {
      const arg = left(scope, locals, assign, inputs) >= right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  ['binary&&'](left, right, context) {
    return function(scope, locals, assign, inputs) {
      const arg = left(scope, locals, assign, inputs) && right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  ['binary||'](left, right, context) {
    return function(scope, locals, assign, inputs) {
      const arg = left(scope, locals, assign, inputs) || right(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  ['ternary?:'](test, alternate, consequent, context) {
    return function(scope, locals, assign, inputs) {
      const arg = test(scope, locals, assign, inputs) ? alternate(scope, locals, assign, inputs) : consequent(scope, locals, assign, inputs);
      return context ? {value: arg} : arg;
    };
  }

  value(value, context) {
    return function() { return context ? {context: undefined, name: undefined, value: value} : value; };
  }

  identifier(name, context, create) {
    return function(scope, locals, assign, inputs) {
      const base = locals && (name in locals) ? locals : scope;
      if (create && create !== 1 && base && base[name] == null) {
        base[name] = {};
      }
      const value = base ? base[name] : undefined;
      if (context) {
        return {context: base, name: name, value: value};
      } else {
        return value;
      }
    };
  }

  computedMember(left, right, context, create, optional) {
    return function(scope, locals, assign, inputs) {
      const lhs = left(scope, locals, assign, inputs);
      let rhs;
      let value;
      if (optional && (lhs == null)) {
        value = undefined;
      } else if (lhs != null) {
        rhs = right(scope, locals, assign, inputs);
        rhs = getStringValue(rhs);
        if (create && create !== 1) {
          if (lhs && !(lhs[rhs])) {
            lhs[rhs] = {};
          }
        }
        value = lhs[rhs];
      }
      if (context) {
        return {context: lhs, name: rhs, value: value};
      } else {
        return value;
      }
    };
  }

  nonComputedMember(left, right, context, create, optional) {
    return function(scope, locals, assign, inputs) {
      const lhs = left(scope, locals, assign, inputs);
      let value;
      if (optional && (lhs == null)) {
        value = undefined;
      } else {
        if (create && create !== 1) {
          if (lhs && lhs[right] == null) {
            lhs[right] = {};
          }
        }
        value = lhs != null ? lhs[right] : undefined;
      }
      if (context) {
        return {context: lhs, name: right, value: value};
      } else {
        return value;
      }
    };
  }

  inputs(input, watchId) {
    return function(scope, value, locals, inputs) {
      if (inputs) return inputs[watchId];
      return input(scope, value, locals);
    };
  }
} 