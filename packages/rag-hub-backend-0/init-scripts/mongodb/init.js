/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-22 14:50:14
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-08-18 14:41:33
 * @Description:
 * @FilePath: /nest-lab/packages/rag-hub-backend-0/init-scripts/mongodb/init.js
 */

// 创建一个数据库
db = db.getSiblingDB('knowledge_hub')

// 创建一个用户和它的密码,角色
db.createUser({
  user: 'knowledge_hub_user',
  pwd: 'knowledge_hub_password',
  roles: [{ role: 'readWrite', db: 'knowledge_hub' }],
})

// 创建一个集合: 用于存放文档
// 文档正文：_id(ObjectId) ↔ kh_document.content_id，documentId ↔ kh_document.id
db.createCollection('document_content')
db.document_content.createIndex({ documentId: 1 }, { unique: true })
db.document_content.createIndex({ deleted: 1 })
