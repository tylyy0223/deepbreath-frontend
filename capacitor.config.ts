import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cn.luoyuyu.deepbreath',
  appName: 'DeepBreath',
  webDir: 'dist',
  // 联网壳模式：APP 直接加载线上版本，前端更新无需重新发包
  server: {
    url: 'https://luoyuyu.cn/app/',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    // SDK 35 强制 edge-to-edge 后 adjustResize 需要自动补插边距，否则键盘遮挡输入框
    adjustMarginsForEdgeToEdge: 'auto',
  },
};

export default config;
