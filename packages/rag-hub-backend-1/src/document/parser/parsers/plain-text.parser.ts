/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-24 15:33:21
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-07-24 15:33:36
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-1/src/document/parser/parsers/plain-text.parser.ts
 */
/**
 * 将 TXT / MD 解析为文本。
 *
 * 不做结构转换：按 UTF-8 原样读出，后续由调用方直接当作 Markdown/纯文本使用。
 */
export function parsePlainText(buffer: Buffer): string {
  return buffer.toString('utf8')
}
