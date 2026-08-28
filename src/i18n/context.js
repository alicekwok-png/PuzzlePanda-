/* ==========================================================================
   i18n context 與 hooks
   --------------------------------------------------------------------------
   刻意跟 I18nProvider.jsx 分開：同一個檔案如果既匯出元件又匯出 hook，
   Vite 的 fast refresh 會失效（改一行字串就整頁重載）。
   ========================================================================== */
import { createContext, useContext } from 'react';

export const I18nContext = createContext(null);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n 必須在 <I18nProvider> 之內使用');
  return ctx;
}

/** 只要翻譯函式時用這個。 */
export function useT() {
  return useI18n().t;
}
