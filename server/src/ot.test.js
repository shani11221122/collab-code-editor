/**
 * Unit tests for the Operational Transform conflict-resolution algorithm.
 *
 * The `transform(opA, opB)` function is the single most critical piece of
 * logic in this project — a silent bug here corrupts documents during
 * concurrent edits. These tests pin its behaviour so future refactors
 * cannot regress it.
 *
 * Run with: npm test
 */
const { transform } = require('./ot');

describe('Operational Transform', () => {
  describe('insert vs insert', () => {
    test('opA comes before opB — position untouched', () => {
      const opA = { type: 'insert', pos: 2, char: 'X' };
      const opB = { type: 'insert', pos: 5, char: 'Y' };
      expect(transform(opA, opB).pos).toBe(2);
    });

    test('opA comes after opB — shifted by inserted length', () => {
      const opA = { type: 'insert', pos: 5, char: 'X' };
      const opB = { type: 'insert', pos: 2, char: 'YY' }; // 2-character insert
      expect(transform(opA, opB).pos).toBe(7);
    });

    test('equal positions — tie broken deterministically (opB wins)', () => {
      const opA = { type: 'insert', pos: 4, char: 'X' };
      const opB = { type: 'insert', pos: 4, char: 'YZ' };
      expect(transform(opA, opB).pos).toBe(6);
    });
  });

  describe('insert vs delete', () => {
    test('insert before the deleted range — untouched', () => {
      const opA = { type: 'insert', pos: 1, char: 'X' };
      const opB = { type: 'delete', pos: 5, length: 2 };
      expect(transform(opA, opB).pos).toBe(1);
    });

    test('insert directly at the start of the deleted range — untouched', () => {
      const opA = { type: 'insert', pos: 5, char: 'X' };
      const opB = { type: 'delete', pos: 5, length: 2 };
      expect(transform(opA, opB).pos).toBe(5);
    });

    test('insert after the deleted range — shifted back by deletion length', () => {
      const opA = { type: 'insert', pos: 10, char: 'X' };
      const opB = { type: 'delete', pos: 2, length: 3 };
      expect(transform(opA, opB).pos).toBe(7);
    });

    test('insert inside the deleted range — clamped to range start', () => {
      const opA = { type: 'insert', pos: 6, char: 'X' };
      const opB = { type: 'delete', pos: 5, length: 3 }; // deletes 5..7
      expect(transform(opA, opB).pos).toBe(5);
    });
  });

  describe('delete vs insert', () => {
    test('insert before our deletion — position shifted forward', () => {
      const opA = { type: 'delete', pos: 8, length: 2 };
      const opB = { type: 'insert', pos: 3, char: 'ABC' };
      const result = transform(opA, opB);
      expect(result.pos).toBe(11);
      expect(result.length).toBe(2);
    });

    test('insert after our deletion — untouched', () => {
      const opA = { type: 'delete', pos: 2, length: 2 };
      const opB = { type: 'insert', pos: 10, char: 'X' };
      expect(transform(opA, opB).pos).toBe(2);
    });
  });

  describe('delete vs delete', () => {
    test('opA fully after opB — shifted back, length preserved', () => {
      const opA = { type: 'delete', pos: 10, length: 2 };
      const opB = { type: 'delete', pos: 2, length: 3 };
      const result = transform(opA, opB);
      expect(result.pos).toBe(7);
      expect(result.length).toBe(2);
    });

    test('opA fully before opB — untouched', () => {
      const opA = { type: 'delete', pos: 1, length: 2 };
      const opB = { type: 'delete', pos: 5, length: 3 };
      const result = transform(opA, opB);
      expect(result.pos).toBe(1);
      expect(result.length).toBe(2);
    });

    test('overlapping ranges — length correctly reduced', () => {
      const opA = { type: 'delete', pos: 5, length: 4 }; // deletes 5..8
      const opB = { type: 'delete', pos: 6, length: 2 }; // deletes 6..7 first
      const result = transform(opA, opB);
      expect(result.pos).toBe(5);
      expect(result.length).toBe(2); // only 5 and 8 remain to delete
    });
  });

  describe('document-level sanity', () => {
    test('sequential ops reconstruct the same document in either order', () => {
      const base = 'hello world';
      const opA = { type: 'insert', pos: 5, char: ',' };
      const opB = { type: 'delete', pos: 0, length: 1 };

      // Apply B first, then transform A by B and apply.
      const aAfterB = transform(opA, opB);
      const docB = apply1(base, opB);
      const docAB = apply1(docB, aAfterB);

      // Apply A first, then transform B by A and apply.
      const bAfterA = transform(opB, opA);
      const docA = apply1(base, opA);
      const docBA = apply1(docA, bAfterA);

      expect(docAB).toBe(docBA);
    });
  });
});

/** Small helper: applies a single op to a string (mirrors server logic). */
function apply1(content, op) {
  if (op.type === 'insert') {
    return content.slice(0, op.pos) + op.char + content.slice(op.pos);
  }
  if (op.type === 'delete') {
    return content.slice(0, op.pos) + content.slice(op.pos + op.length);
  }
  return content;
}