import { Capacitor } from '@capacitor/core';

export const APK_DOWNLOAD_URL = 'https://luoyuyu.cn/app/download/deepbreath-latest.apk';
const VERSION_JSON_URL = '/app/download/version.json';
const DISMISS_KEY = 'app_update_dismissed';

export interface AppVersionInfo {
  versionName: string;
  versionCode: number;
  url: string;
  notes?: string;
}

/** 是否运行在安卓壳 APP 内 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * 壳 APP 内检查新版本。浏览器环境返回 null。
 * v1.1 老壳没有 @capacitor/app 插件 → 取不到版本号，按旧版处理（提示升级）。
 */
export async function checkAppUpdate(): Promise<AppVersionInfo | null> {
  if (!isNativeApp()) return null;
  try {
    const res = await fetch(`${VERSION_JSON_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    const latest = await res.json();
    if (!latest?.versionCode) return null;

    // version.json 结构：{ android: { url }, mac: { url } } —— 取当前平台对应 URL
    let url: string = APK_DOWNLOAD_URL;
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.getPlatform() === 'ios') {
        url = latest.ios?.url || latest.mac?.url || APK_DOWNLOAD_URL;
      } else {
        url = latest.android?.url || APK_DOWNLOAD_URL;
      }
    } catch {
      url = latest.android?.url || APK_DOWNLOAD_URL;
    }

    let current = 0;
    try {
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();
      current = parseInt(info.build, 10) || 0;
    } catch {
      current = 0; // 老版本壳无插件
    }

    if (latest.versionCode > current) {
      // 同一版本被用户关闭过提示则不再打扰
      if (localStorage.getItem(DISMISS_KEY) === String(latest.versionCode)) return null;
      return { ...latest, url };
    }
  } catch { /* 网络失败静默 */ }
  return null;
}

export function dismissUpdate(versionCode: number) {
  localStorage.setItem(DISMISS_KEY, String(versionCode));
}

/** 打开下载（优先系统浏览器，WebView 内无法直接下载 APK） */
export async function openDownload(url: string = APK_DOWNLOAD_URL) {
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } catch {
    window.open(url, '_blank');
  }
}
