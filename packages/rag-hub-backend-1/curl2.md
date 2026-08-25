<!--
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-08-20 11:36:50
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-08-21 16:57:37
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-1/curl2.md
-->

```bash
curl -s -X POST http://localhost:3000/documents/upload/parse \
  -F 'file=@./test-files/申论总结课.pptx' \
  -F 'authorId=10001' \
  -F 'createBy=10001' | jq
```

```bash
DOC_ID='349112958875340800'
curl -s "http://localhost:3000/documents/${DOC_ID}" | jq
```
