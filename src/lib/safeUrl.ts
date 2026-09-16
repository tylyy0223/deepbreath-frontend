/**
 * 图片 URL 安全校验 — 防止 javascript: / data: 协议 XSS
 *
 * 只允许: http(s):// 和 / 开头的相对路径
 * 后端返回的上传 URL 都是 /uploads/xxx.jpg 格式, 不受影响
 */
export function isSafeImageUrl(url: string): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url) || url.startsWith("/");
}
