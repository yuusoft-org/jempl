export const NodeType = {
  LITERAL: 0,
  VARIABLE: 1,
  INTERPOLATION: 2,
  FUNCTION: 3,
  BINARY: 4,
  UNARY: 5,
  CONDITIONAL: 6,
  LOOP: 7,
  OBJECT: 8,
  ARRAY: 9,
};

export const BinaryOp = {
  EQ: 0, // ==
  NEQ: 1, // !=
  GT: 2, // >
  LT: 3, // <
  GTE: 4, // >=
  LTE: 5, // <=
  AND: 6, // &&
  OR: 7, // ||
  IN: 8, // in
};

export const UnaryOp = {
  NOT: 0, // !
};
