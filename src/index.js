import { Lexer } from './lexer.js';
import { AST } from './ast.js';
import { ASTInterpreter } from './ast-interpreter.js';
import { isLiteral, isConstant } from './utils.js';

export class Parser {
  constructor(lexer, options) {
    this.ast = new AST(lexer, options);
    this.astCompiler = new ASTInterpreter();
  }

  parse(text) {
    const ast = this.getAst(text);
    const fn = this.astCompiler.compile(ast.ast);
    fn.literal = isLiteral(ast.ast);
    fn.constant = isConstant(ast.ast);
    fn.oneTime = ast.oneTime;
    return fn;
  }

  getAst(exp) {
    let oneTime = false;
    exp = exp.trim();

    if (exp.charAt(0) === ':' && exp.charAt(1) === ':') {
      oneTime = true;
      exp = exp.substring(2);
    }
    return {
      ast: this.ast.ast(exp),
      oneTime: oneTime
    };
  }
}

function SafeExpression(options = {}) {
  const lexer = new Lexer();
  const parser = new Parser(lexer, options);
  
  function execute(text) {
    return parser.parse(text);
  }

  execute.parse = function(text) {
    return parser.parse(text);
  };

  return execute;
}

export default SafeExpression;