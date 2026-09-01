<!--
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-08-20 11:36:50
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-09-01 10:41:38
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-2/curl2.md
-->

```bash
curl -s -X POST http://localhost:3000/documents/upload/parse \
  -F 'file=@./test-files/员工考勤表.xlsx' \
  -F 'authorId=10001' \
  -F 'createBy=10001' | jq
```

```bash
curl -s -X POST http://localhost:3000/documents/upload/parse \
  -F 'file=@./test-files/李先生_28岁_76761.pdf' \
  -F 'authorId=10001' \
  -F 'createBy=10001' | jq
```

```bash
curl -s -X POST http://localhost:3000/documents/upload/parse \
  -F 'file=@./test-files/梁多强_Agent开发_17601230573.docx' \
  -F 'authorId=10001' \
  -F 'createBy=10001' | jq
```

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
