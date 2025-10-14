import { MongoEvalItem } from '../../task/schema';
import { Types } from '../../../../common/mongo';
import { addLog } from '../../../../common/system/log';
import { franc } from 'franc';
import { tify } from 'chinese-conv';

export enum LanguageType {
  English = 'en',
  SimplifiedChinese = 'zh-CN',
  TraditionalChinese = 'zh-TW'
}

interface LanguageDetectionResult {
  language: LanguageType;
  englishRatio: number;
  simplifiedChineseRatio: number;
  traditionalChineseRatio: number;
  totalCharacters: number;
}

/**
 * Detect languages from multiple text strings using franc and chinese-conv
 * @param texts - Array of text strings to analyze
 * @param returnMode - 'majority' returns the most common language, 'list' returns all detected languages
 * @returns Single language code or array of language codes
 */
export function detectLanguages(
  texts: string[],
  returnMode: 'majority' | 'list' = 'majority'
): ('en' | 'zh-cn' | 'zh-tw') | ('en' | 'zh-cn' | 'zh-tw')[] {
  const results: ('en' | 'zh-cn' | 'zh-tw')[] = [];

  for (const text of texts) {
    const lang = franc(text || '');

    if (lang === 'eng') {
      results.push('en');
      continue;
    }

    if (lang === 'cmn' || /[\u4e00-\u9fff]/.test(text)) {
      const hant = tify(text);
      results.push(text === hant ? 'zh-tw' : 'zh-cn');
      continue;
    }

    results.push('en');
  }

  if (returnMode === 'list') return results;

  const counts = results.reduce(
    (acc, cur) => {
      acc[cur] = (acc[cur] || 0) + 1;
      return acc;
    },
    {} as Record<'en' | 'zh-cn' | 'zh-tw', number>
  );

  // 固定优先级：简体 > 繁体 > 英文
  const priority: Record<'en' | 'zh-cn' | 'zh-tw', number> = {
    'zh-cn': 3,
    'zh-tw': 2,
    en: 1
  };

  const sorted = Object.entries(counts).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return priority[b[0] as keyof typeof priority] - priority[a[0] as keyof typeof priority];
  });

  return (sorted[0]?.[0] as 'en' | 'zh-cn' | 'zh-tw') || 'en';
}

/**
 * Convert language code to LanguageType enum
 */
function languageCodeToType(code: 'en' | 'zh-cn' | 'zh-tw'): LanguageType {
  switch (code) {
    case 'en':
      return LanguageType.English;
    case 'zh-cn':
      return LanguageType.SimplifiedChinese;
    case 'zh-tw':
      return LanguageType.TraditionalChinese;
    default:
      return LanguageType.SimplifiedChinese;
  }
}

// Detect primary language of evaluation user inputs
export async function detectEvaluationLanguage(evalId: string): Promise<LanguageDetectionResult> {
  try {
    addLog.info('[LanguageUtil] Starting language detection', { evalId });

    const evalItems = await MongoEvalItem.find(
      { evalId: new Types.ObjectId(evalId) },
      { 'dataItem.userInput': 1 }
    ).lean();

    if (!evalItems || evalItems.length === 0) {
      addLog.warn('[LanguageUtil] No evaluation items found', { evalId });
      return {
        language: LanguageType.SimplifiedChinese,
        englishRatio: 0,
        simplifiedChineseRatio: 0,
        traditionalChineseRatio: 0,
        totalCharacters: 0
      };
    }

    const userInputTexts = evalItems
      .map((item) => item.dataItem?.userInput || '')
      .filter((input) => input.trim().length > 0);

    if (userInputTexts.length === 0) {
      addLog.warn('[LanguageUtil] No user input text found', { evalId });
      return {
        language: LanguageType.SimplifiedChinese,
        englishRatio: 0,
        simplifiedChineseRatio: 0,
        traditionalChineseRatio: 0,
        totalCharacters: 0
      };
    }

    // Use new language detection with franc and chinese-conv
    const detectedLanguages = detectLanguages(userInputTexts, 'list') as (
      | 'en'
      | 'zh-cn'
      | 'zh-tw'
    )[];

    // Calculate ratios
    const totalCount = detectedLanguages.length;
    const enCount = detectedLanguages.filter((l) => l === 'en').length;
    const zhCnCount = detectedLanguages.filter((l) => l === 'zh-cn').length;
    const zhTwCount = detectedLanguages.filter((l) => l === 'zh-tw').length;

    const englishRatio = totalCount > 0 ? Math.round((enCount / totalCount) * 100) : 0;
    const simplifiedChineseRatio = totalCount > 0 ? Math.round((zhCnCount / totalCount) * 100) : 0;
    const traditionalChineseRatio = totalCount > 0 ? Math.round((zhTwCount / totalCount) * 100) : 0;

    // Get majority language
    const majorityLanguageCode = detectLanguages(userInputTexts, 'majority') as
      | 'en'
      | 'zh-cn'
      | 'zh-tw';
    const language = languageCodeToType(majorityLanguageCode);

    // Calculate total characters from all texts
    const totalCharacters = userInputTexts.reduce((sum, text) => sum + text.length, 0);

    addLog.info('[LanguageUtil] Language detection completed', {
      evalId,
      language,
      englishRatio,
      simplifiedChineseRatio,
      traditionalChineseRatio,
      totalCharacters
    });

    return {
      language,
      englishRatio,
      simplifiedChineseRatio,
      traditionalChineseRatio,
      totalCharacters
    };
  } catch (error) {
    addLog.error('[LanguageUtil] Language detection failed', {
      evalId,
      error
    });
    return {
      language: LanguageType.SimplifiedChinese,
      englishRatio: 0,
      simplifiedChineseRatio: 0,
      traditionalChineseRatio: 0,
      totalCharacters: 0
    };
  }
}
