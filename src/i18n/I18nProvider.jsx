/* ==========================================================================
   輕量 i18n Provider
   --------------------------------------------------------------------------
   刻意不引入 react-i18next：這個專案只有三種語言、約 45 條字串、沒有複數
   規則也沒有 RTL 需求，一個 context + 一個 t() 就夠，省掉一個重依賴與它
   的打包體積。

   用法（hook 在 ./context.js）：
     const t = useT();
     t('game.undo')                                   // → 「復原」
     t('win.levelLine', { n: 3, chapterName: '貓咪' })

   插值語法 {{name}}，跟 i18n-strings-draft.json 一致。
   ========================================================================== */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadLanguage, saveLanguage } from '../game/storage';
import en from '../locales/en.json';
import zhHans from '../locales/zh-Hans.json';
import zhHant from '../locales/zh-Hant.json';
import { I18nContext } from './context';
import { DEFAULT_LANG, detectLanguage, isSupported, LANGUAGES } from './languages';

const DICTS = {
  'zh-Hant': zhHant,
  'zh-Hans': zhHans,
  en,
};

function initialLanguage() {
  const saved = loadLanguage();
  if (saved && isSupported(saved)) return saved;
  try {
    return detectLanguage(navigator.languages ?? [navigator.language]);
  } catch {
    return DEFAULT_LANG;
  }
}

function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole,
  );
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(initialLanguage);

  useEffect(() => {
    const entry = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.lang = entry ? entry.htmlLang : DEFAULT_LANG;
  }, [lang]);

  const changeLanguage = useCallback((code) => {
    if (!isSupported(code)) return;
    saveLanguage(code);
    setLang(code);
  }, []);

  const t = useCallback(
    (key, params) => {
      const dict = DICTS[lang] ?? DICTS[DEFAULT_LANG];
      // 找不到就退回保底語言，再找不到就把 key 本身顯示出來 ——
      // 寧願畫面上看到 key，也不要空白，漏字才看得見。
      let value = dict[key];
      if (typeof value !== 'string') value = DICTS[DEFAULT_LANG][key];
      if (typeof value !== 'string') {
        if (import.meta.env.DEV) console.warn(`[i18n] 缺少字串：${key}`);
        return key;
      }
      return interpolate(value, params);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, changeLanguage, t }), [lang, changeLanguage, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
