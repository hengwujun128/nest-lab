/*
 * @Author: 张泽全 hengwujun128@gmail.com
 * @Date: 2026-07-22 15:25:00
 * @LastEditors: 张泽全 hengwujun128@gmail.com
 * @LastEditTime: 2026-07-22 15:45:28
 * @Description: 
 * @FilePath: /rag-hub-backend/init-scripts/postgresql/init.sql
 */
-- 文档元数据表
CREATE TABLE IF NOT EXISTS kh_document (
    id BIGINT PRIMARY KEY,
    title VARCHAR NOT NULL,
    content_id VARCHAR NOT NULL UNIQUE,
    summary VARCHAR,
    category_id BIGINT,
    team_id BIGINT,
    author_id BIGINT,
    cover_image VARCHAR,
    tags VARCHAR,
    status SMALLINT NOT NULL DEFAULT 0,
    remark VARCHAR,
    view_count INT NOT NULL DEFAULT 0,
    like_count INT NOT NULL DEFAULT 0,
    comment_count INT NOT NULL DEFAULT 0,
    favorite_count INT NOT NULL DEFAULT 0,
    word_count INT NOT NULL DEFAULT 0,
    publish_time TIMESTAMP,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    create_by BIGINT,
    update_by BIGINT,
    deleted BOOLEAN NOT NULL DEFAULT false
);