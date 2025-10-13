// Type declarations for external packages without proper TypeScript support

/**
 * franc - Language detection library
 * Detects the language of text using character n-gram frequency analysis
 */
declare module 'franc' {
  /**
   * Detect the language of text
   * @param text - Text to analyze for language detection
   * @param options - Detection options
   * @returns ISO 639-3 language code (e.g., 'eng' for English, 'cmn' for Chinese)
   */
  export function franc(
    text: string,
    options?: {
      minLength?: number;
      whitelist?: string[];
      blacklist?: string[];
    }
  ): string;

  export default franc;
}

/**
 * chinese-conv - Chinese character conversion library
 * Converts between simplified and traditional Chinese
 */
declare module 'chinese-conv' {
  /**
   * Convert simplified Chinese to tra·ditional Chinese (Hant)
   * @param text - Simplified Chinese text to convert
   * @returns Traditional Chinese text
   */
  export function zh2Hant(text: string): string;

  /**
   * Convert traditional Chinese to simplified Chinese (Hans)
   * @param text - Traditional Chinese text to convert
   * @returns Simplified Chinese text
   */
  export function zh2Hans(text: string): string;

  /**
   * Check if the text is simplified Chinese
   * @param text - Text to check
   * @returns True if text is simplified Chinese
   */
  export function isSimplifiedChinese(text: string): boolean;

  /**
   * Check if the text is traditional Chinese
   * @param text - Text to check
   * @returns True if text is traditional Chinese
   */
  export function isTraditionalChinese(text: string): boolean;
}
