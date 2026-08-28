/* ==========================================================================
   支援的語言
   --------------------------------------------------------------------------
   label 永遠用該語言自己的寫法顯示（繁體中文 / 简体中文 / English），
   不會跟著目前介面語言變 —— 這是語言選單的通用慣例，否則使用者看不懂
   自己要選哪一個。
   ========================================================================== */

export const LANGUAGES = [
  { code: 'zh-Hant', label: '繁體中文', htmlLang: 'zh-Hant' },
  { code: 'zh-Hans', label: '简体中文', htmlLang: 'zh-Hans' },
  { code: 'en', label: 'English', htmlLang: 'en' },
];

/** 認不出裝置語言時的保底語言。 */
export const DEFAULT_LANG = 'zh-Hant';

export const LANG_CODES = LANGUAGES.map((l) => l.code);

export function isSupported(code) {
  return LANG_CODES.includes(code);
}

/**
 * 由裝置語言推斷要用哪一個。
 * 繁簡判斷靠地區碼：台港澳算繁體，中國大陸/新加坡算簡體，
 * 只寫 "zh" 沒有地區的話走保底（繁體）。
 */
export function detectLanguage(navLanguages) {
  const list = (navLanguages && navLanguages.length ? navLanguages : [DEFAULT_LANG]).map((l) =>
    String(l).toLowerCase(),
  );

  for (const tag of list) {
    if (tag.startsWith('en')) return 'en';
    if (tag.startsWith('zh')) {
      if (/hant|-tw|-hk|-mo/.test(tag)) return 'zh-Hant';
      if (/hans|-cn|-sg|-my/.test(tag)) return 'zh-Hans';
      return DEFAULT_LANG; // 只寫 zh，無法判斷繁簡
    }
  }
  return DEFAULT_LANG;
}
