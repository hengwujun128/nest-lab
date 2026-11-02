import { RoleCode } from '../common/constants/roles'
import type { AuthUser } from '../auth/auth-user.interface'
import { DocumentStatus } from './document-status'
import type { DocumentEntity } from './entities/document.entity'

/** 当前用户可读哪些文档：公开 ∪ 所在团队 ∪ 自己写的；管理员/审核员不限制 */
export type DocumentAccessScope = {
  unrestricted: boolean
  userId: string
  teamIds: string[]
}

export function accessFromUser(user: AuthUser): DocumentAccessScope {
  const roles = user.roles ?? []
  return {
    // 用户的角色是 管理员 或者 审核员，则不限制访问权限
    unrestricted: roles.includes(RoleCode.ADMIN) || roles.includes(RoleCode.REVIEWER),
    // 用户的ID
    userId: user.userId,
    // 用户的团队ID，如果没有团队ID，则返回空数组
    teamIds: user.teamIds ?? [],
  }
}

export function canReadDocument(
  doc: Pick<DocumentEntity, 'authorId' | 'teamId' | 'isPublic' | 'status'>,
  scope: DocumentAccessScope,
): boolean {
  if (scope.unrestricted) return true
  if (doc.authorId && doc.authorId === scope.userId) return true
  if (doc.status !== DocumentStatus.Published) return false
  if (doc.isPublic) return true
  return Boolean(doc.teamId && scope.teamIds.includes(doc.teamId))
}

export function canWriteDocument(doc: Pick<DocumentEntity, 'authorId'>, user: AuthUser): boolean {
  if (user.roles?.includes(RoleCode.ADMIN)) return true
  return Boolean(doc.authorId && doc.authorId === user.userId)
}

export const ES_CHUNK_VISIBILITY_FIELDS = {
  isPublic: 'is_public',
  authorId: 'author_id',
  teamId: 'team_id',
}

export const ES_DOC_VISIBILITY_FIELDS = {
  isPublic: 'isPublic',
  authorId: 'authorId',
  teamId: 'teamId',
}

/**
 * Elasticsearch 可见性 filter（只筛不打分）。
 * fields 区分 kh_document（camelCase）与 kh_chunk（snake_case）。
 * 管理员/审核员返回 null，调用方不加过滤。
 */
export function esVisibilityFilter(
  scope: DocumentAccessScope,
  fields: { isPublic: string; authorId: string; teamId: string },
): Record<string, unknown> | null {
  // 如果用户是不受限制的，则返回 null
  if (scope.unrestricted) return null
  // 公开 ∪ 自己写的；有团队再 OR 所在团队。不判断 status，假定未发布未进索引。
  // 需要匹配的条件
  const should: Record<string, unknown>[] = [
    { term: { [fields.isPublic]: true } },
    { term: { [fields.authorId]: scope.userId } },
  ]
  // 如果用户有团队ID，则添加团队ID的过滤条件
  if (scope.teamIds.length) {
    should.push({ terms: { [fields.teamId]: scope.teamIds } })
  }
  // filter 上下文中 should = 或；至少命中一条才可见(3 个条件选择一个就可以看到文档)
  return { bool: { should, minimum_should_match: 1 } }
}

/** 相关性查询放 must，可见性放 filter，避免权限条件影响打分 */
export function wrapEsQuery(
  query: Record<string, unknown>,
  filter: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!filter) return query
  return {
    bool: {
      must: [query],
      filter: [filter],
    },
  }
}

export function neo4jAccessParams(scope?: DocumentAccessScope) {
  return {
    unrestricted: !scope || scope.unrestricted,
    accessUserId: scope?.userId ?? '',
    accessTeamIds: scope?.teamIds ?? [],
  }
}

/** Cypher：文档节点是否对当前用户可见
 * public 公开的文档
 * authorId 自己写的文档
 * teamId 所在团队
 * unrestricted 不受限制
 * accessUserId 当前用户ID
 * accessTeamIds 当前用户团队ID
 */
export function neo4jDocumentAccessWhere(alias = 'd'): string {
  return (
    `($unrestricted OR ${alias}.authorId = $accessUserId ` +
    `OR ${alias}.isPublic = true OR ${alias}.teamId IN $accessTeamIds)`
  )
}
