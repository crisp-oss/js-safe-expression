export const LITERALS = {
  'true': true,
  'false': false,
  'null': null,
  'undefined': undefined
};

export const OPERATORS = {};

'+ - * / % === !== == != < > <= >= && || ! ='.split(' ').forEach(function(operator) {
  OPERATORS[operator] = true;
});

export const ESCAPE = {
  'n':'\n',
  'f':'\f',
  'r':'\r',
  't':'\t',
  'v':'\v',
  '\'':'\'',
  '"':'"'
};

export const PURITY_ABSOLUTE = 1;
export const PURITY_RELATIVE = 2; 