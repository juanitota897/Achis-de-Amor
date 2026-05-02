/**
 * Pattern validator.
 *
 * Runs sanity checks against a parsed pattern and produces ValidationErrors
 * with severity, code, message, and (when possible) a suggested fix.
 *
 * The parser already produces some errors during parsing; this validator
 * runs a second pass over the structured Pattern to catch higher-level issues.
 */

import type { Pattern, ValidationError, Round, Piece } from './types';

export function validatePattern(pattern: Pattern): ValidationError[] {
  const errors: ValidationError[] = [...pattern.errors];

  for (const piece of pattern.pieces) {
    // Each round
    for (const round of piece.rounds) {
      checkDeclaredCount(round, piece, errors);
      checkImpossibleDecrease(round, piece, errors);
      checkAbruptChange(round, piece, errors);
    }

    // Whole piece
    checkPieceShape(piece, errors);
  }

  return errors;
}

/** Compare declared count vs computed count. */
function checkDeclaredCount(round: Round, piece: Piece, errors: ValidationError[]): void {
  if (round.declaredCount === undefined) return;
  if (round.declaredCount !== round.stitchCount) {
    errors.push({
      severity: 'error',
      code: 'COUNT_MISMATCH',
      message: `La ronda ${round.number} declara ${round.declaredCount} puntos pero suma ${round.stitchCount}.`,
      pieceId: piece.id,
      round: round.number,
      suggestion: `Revisar las operaciones de la ronda ${round.number} o el conteo declarado.`,
    });
  }
}

/** Detect rounds that consume more stitches than the previous round had. */
function checkImpossibleDecrease(round: Round, piece: Piece, errors: ValidationError[]): void {
  const idx = piece.rounds.indexOf(round);
  if (idx === 0) return;
  const prev = piece.rounds[idx - 1];

  // Count the stitches consumed from the previous round
  let consumed = 0;
  function visitOp(op: { stitch: string; count: number; group?: any[] }): void {
    if (op.group && op.group.length > 0) {
      const innerConsumed = op.group.reduce((s, sub) => {
        return s + (sub.stitch === 'dec' ? 2 * sub.count : sub.count);
      }, 0);
      consumed += innerConsumed * op.count;
    } else {
      consumed += op.stitch === 'dec' ? 2 * op.count : op.count;
    }
  }
  for (const op of round.operations) visitOp(op as any);

  if (consumed > prev.stitchCount + 1) {
    // +1 tolerance for off-by-one in joining patterns
    errors.push({
      severity: 'error',
      code: 'IMPOSSIBLE_DECREASE',
      message: `La ronda ${round.number} intenta consumir ${consumed} puntos pero la ronda anterior solo tiene ${prev.stitchCount}.`,
      pieceId: piece.id,
      round: round.number,
      suggestion: `Revisar los aumentos/disminuciones — el patrón puede tener un error tipográfico.`,
    });
  }
}

/** Warn if stitch count changes by more than 50% in a single round (excluding round 1). */
function checkAbruptChange(round: Round, piece: Piece, errors: ValidationError[]): void {
  const idx = piece.rounds.indexOf(round);
  if (idx === 0) return;
  const prev = piece.rounds[idx - 1];
  if (prev.stitchCount === 0) return;
  const ratio = round.stitchCount / prev.stitchCount;
  if (ratio > 2.0 || ratio < 0.4) {
    errors.push({
      severity: 'warning',
      code: 'ABRUPT_CHANGE',
      message: `Cambio brusco en la ronda ${round.number}: de ${prev.stitchCount} a ${round.stitchCount} puntos.`,
      pieceId: piece.id,
      round: round.number,
      suggestion: `Verificar si es intencional. Cambios mayores al 100% suelen indicar un error.`,
    });
  }
}

/** Sanity check: piece should have a coherent shape. */
function checkPieceShape(piece: Piece, errors: ValidationError[]): void {
  if (piece.rounds.length === 0) {
    errors.push({
      severity: 'warning',
      code: 'EMPTY_PIECE',
      message: `La pieza "${piece.name}" no tiene rondas.`,
      pieceId: piece.id,
    });
    return;
  }

  // Check that rounds are consecutive (no gaps)
  for (let i = 1; i < piece.rounds.length; i++) {
    if (piece.rounds[i].number !== piece.rounds[i - 1].number + 1) {
      errors.push({
        severity: 'warning',
        code: 'ROUND_GAP',
        message: `Salto de rondas en "${piece.name}": de ${piece.rounds[i - 1].number} a ${piece.rounds[i].number}.`,
        pieceId: piece.id,
        round: piece.rounds[i].number,
      });
      break;
    }
  }
}
