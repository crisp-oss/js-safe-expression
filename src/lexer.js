import { OPERATORS, ESCAPE } from './constants.js';

export class Lexer {
  constructor() {}

  lex(text) {
    this.text = text;
    this.index = 0;
    this.tokens = [];

    while (this.index < this.text.length) {
      var ch = this.text.charAt(this.index);
      if (ch === '"' || ch === '\'') {
        this.readString(ch);
      } else if (this.isNumber(ch) || ch === '.' && this.isNumber(this.peek())) {
        this.readNumber();
      } else if (this.isIdentifierStart(this.peekMultichar())) {
        this.readIdent();
      } else if (ch === '?' && this.peek() === '.') {
        this.tokens.push({index: this.index, text: '?.', optionalChaining: true});
        this.index += 2;
      } else if (this.is(ch, '(){}[].,;:?')) {
        this.tokens.push({index: this.index, text: ch});
        this.index++;
      } else if (this.isWhitespace(ch)) {
        this.index++;
      } else {
        var ch2 = ch + this.peek();
        var ch3 = ch2 + this.peek(2);

        var op1 = OPERATORS[ch];
        var op2 = OPERATORS[ch2];
        var op3 = OPERATORS[ch3];

        if (op1 || op2 || op3) {
          var token = op3 ? ch3 : (op2 ? ch2 : ch);
          this.tokens.push({index: this.index, text: token, operator: true});
          this.index += token.length;
        } else {
          this.throwError('Unexpected next character ', this.index, this.index + 1);
        }
      }
    }
    return this.tokens;
  }

  is(ch, chars) {
    return chars.indexOf(ch) !== -1;
  }

  peek(i) {
    var num = i || 1;
    return (this.index + num < this.text.length) ? this.text.charAt(this.index + num) : false;
  }

  isNumber(ch) {
    return ('0' <= ch && ch <= '9') && typeof ch === 'string';
  }

  isWhitespace(ch) {
    // IE treats non-breaking space as \u00A0
    return (ch === ' ' || ch === '\r' || ch === '\t' ||
            ch === '\n' || ch === '\v' || ch === '\u00A0');
  }

  isIdentifierStart(ch) {
    return this.isValidIdentifierStart(ch);
  }

  isValidIdentifierStart(ch) {
    return ('a' <= ch && ch <= 'z' ||
            'A' <= ch && ch <= 'Z' ||
            '_' === ch || ch === '$');
  }

  isIdentifierContinue(ch) {
    return this.isValidIdentifierContinue(ch);
  }

  isValidIdentifierContinue(ch, cp) {
    return this.isValidIdentifierStart(ch, cp) || this.isNumber(ch);
  }

  codePointAt(ch) {
    if (ch.length === 1) return ch.charCodeAt(0);
    // eslint-disable-next-line no-bitwise
    return (ch.charCodeAt(0) << 10) + ch.charCodeAt(1) - 0x35FDC00;
  }

  peekMultichar() {
    var ch = this.text.charAt(this.index);
    var peek = this.peek();
    if (!peek) {
      return ch;
    }
    var cp1 = ch.charCodeAt(0);
    var cp2 = peek.charCodeAt(0);
    if (cp1 >= 0xD800 && cp1 <= 0xDBFF && cp2 >= 0xDC00 && cp2 <= 0xDFFF) {
      return ch + peek;
    }
    return ch;
  }

  isExpOperator(ch) {
    return (ch === '-' || ch === '+' || this.isNumber(ch));
  }

  throwError(error, start, end) {
    end = end || this.index;
    var colStr = typeof start !== "undefined"
            ? 's ' + start +  '-' + this.index + ' [' + this.text.substring(start, end) + ']'
            : ' ' + end;

    throw new Error('Lexer Error: ' + error + ' at column' + colStr + ' in expression [' + this.text + '].');
  }

  readNumber() {
    var number = '';
    var start = this.index;
    while (this.index < this.text.length) {
      var ch = this.text.charAt(this.index).toLowerCase();
      if (ch === '.' || this.isNumber(ch)) {
        number += ch;
      } else {
        var peekCh = this.peek();
        if (ch === 'e' && this.isExpOperator(peekCh)) {
          number += ch;
        } else if (this.isExpOperator(ch) &&
            peekCh && this.isNumber(peekCh) &&
            number.charAt(number.length - 1) === 'e') {
          number += ch;
        } else if (this.isExpOperator(ch) &&
            (!peekCh || !this.isNumber(peekCh)) &&
            number.charAt(number.length - 1) === 'e') {
          this.throwError('Invalid exponent');
        } else {
          break;
        }
      }
      this.index++;
    }
    this.tokens.push({
      index: start,
      text: number,
      constant: true,
      value: Number(number)
    });
  }

  readIdent() {
    var start = this.index;
    this.index += this.peekMultichar().length;
    while (this.index < this.text.length) {
      var ch = this.peekMultichar();
      if (!this.isIdentifierContinue(ch)) {
        break;
      }
      this.index += ch.length;
    }
    this.tokens.push({
      index: start,
      text: this.text.slice(start, this.index),
      identifier: true
    });
  }

  readString(quote) {
    var start = this.index;
    this.index++;
    var string = '';
    var rawString = quote;
    var escape = false;
    while (this.index < this.text.length) {
      var ch = this.text.charAt(this.index);
      rawString += ch;
      if (escape) {
        if (ch === 'u') {
          var hex = this.text.substring(this.index + 1, this.index + 5);
          if (!hex.match(/[\da-f]{4}/i)) {
            this.throwError('Invalid unicode escape [\\u' + hex + ']');
          }
          this.index += 4;
          string += String.fromCharCode(parseInt(hex, 16));
        } else {
          var rep = ESCAPE[ch];
          string = string + (rep || ch);
        }
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === quote) {
        this.index++;
        this.tokens.push({
          index: start,
          text: rawString,
          constant: true,
          value: string
        });
        return;
      } else {
        string += ch;
      }
      this.index++;
    }
    this.throwError('Unterminated quote', start);
  }
} 