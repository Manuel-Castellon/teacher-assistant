export interface MathExpression {
  latex: string;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface OCRResult {
  text: string;                  // extracted Hebrew + non-math text
  mathExpressions: MathExpression[];
  confidence: number;            // 0-1
  language: 'he' | 'en' | 'mixed';
  provider: 'mathpix' | 'google-document-ai' | 'tesseract' | 'azure';
  processedAt: string;           // ISO timestamp
}

/**
 * OCR provider interface.
 * Decision: MathPix vs Google Document AI vs Tesseract vs Azure — ASK USER at MVP 0 after testing.
 * Test on real Hebrew math exam scans before deciding. Test Hebrew prose and math notation separately.
 *
 * Note: AWS Textract does NOT support Hebrew — do not use it.
 */
export interface IOCRProvider {
  extractText(imageBuffer: Buffer, mimeType: string): Promise<OCRResult>;
  extractMathExpressions(imageBuffer: Buffer): Promise<MathExpression[]>;
  readonly providerName: string;
}
