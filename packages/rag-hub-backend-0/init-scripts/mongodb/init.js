/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-22 14:50:14
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-07-22 14:50:22
 * @Description:
 * @FilePath: /rag-hub-backend/init-scripts/mongodb/init.js
 */
db = db.getSiblingDB('knowledge_hub');

db.createUser({
  user: 'knowledge_hub_user',
  pwd: 'knowledge_hub_password',
  roles: [{ role: 'readWrite', db: 'knowledge_hub' }],
});

// 文档正文：_id(ObjectId) ↔ kh_document.content_id，documentId ↔ kh_document.id
db.createCollection('document_content');
db.document_content.createIndex({ documentId: 1 }, { unique: true });
db.document_content.createIndex({ deleted: 1 });
