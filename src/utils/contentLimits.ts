/**
 * Length bounds for user-authored content.
 *
 * Kept free of server imports so the composer UI and the server validators can
 * share one definition — the client disables its Post button on these bounds,
 * and the server rejects anything that gets past it.
 */

export const QUESTION_MIN_LENGTH = 5;
export const QUESTION_MAX_LENGTH = 500;

export const ANSWER_MIN_LENGTH = 1;
export const ANSWER_MAX_LENGTH = 1000;
