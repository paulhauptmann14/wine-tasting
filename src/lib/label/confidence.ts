/**
 * Tesseract confidence (0–100) below which a line is ignored. The OCR run drops these lines, and
 * parseLabel drops them again, because it is a pure function that tests call with raw lines.
 */
export const MIN_CONFIDENCE = 30
