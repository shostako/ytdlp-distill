import { useCallback } from 'react';
import { useSettingsStore } from './stores/settings-store';
import { translate, translateError, type MsgKey, type MsgParams } from '../shared/i18n';

/** 現在の表示言語で辞書を引く t() と、main のエラーコードを訳す te() */
export function useT() {
  const locale = useSettingsStore((s) => s.locale);
  const t = useCallback((key: MsgKey, params?: MsgParams) => translate(locale, key, params), [locale]);
  const te = useCallback((message: string | null | undefined) => translateError(locale, message), [locale]);
  return { t, te, locale };
}
