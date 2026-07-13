import "server-only";

import { and, asc, desc, eq, exists, inArray, isNull, or, sql } from "drizzle-orm";

import { questionTags, questions, tags } from "@/db/schema";
import { getDb } from "@/lib/db";
import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import type { WorkspaceTag } from "@/lib/tags";
import type { WorkspaceActor } from "@/server/workspaces/authorization";
import { requireWorkspaceMember, requireWorkspaceStaff } from "@/server/workspaces/authorization";

type Db = ReturnType<typeof getDb>;
type Queryable = Pick<Db, "query">;
export type DatabaseTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

function toWorkspaceTag(tag: typeof tags.$inferSelect): WorkspaceTag {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    isPreset: tag.isPreset,
  };
}

function assertDistinctTagIds(tagIds: readonly string[]) {
  const uniqueTagIds = [...new Set(tagIds)];
  if (uniqueTagIds.length !== tagIds.length) {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }
  return uniqueTagIds;
}

async function createUniqueWorkspaceTagSlug(
  db: Queryable,
  workspaceId: string,
  name: string,
  tagId?: string,
) {
  const baseSlug = slugify(name).slice(0, 110) || "tag";
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db.query.tags.findFirst({
      where: and(
        eq(tags.workspaceId, workspaceId),
        eq(tags.slug, slug),
        tagId ? sql`${tags.id} <> ${tagId}` : undefined,
      ),
      columns: { id: true },
    });
    if (!existing) return slug;
    const suffixText = `-${suffix}`;
    slug = `${baseSlug.slice(0, 120 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
}

async function requireMutableWorkspaceTag(
  tx: DatabaseTransaction,
  workspaceId: string,
  tagId: string,
) {
  const tag = await tx.query.tags.findFirst({ where: eq(tags.id, tagId) });
  if (!tag) throw new AppError(Messages.tagNotFound, 404, ErrorCode.NOT_FOUND);
  if (tag.isPreset || tag.workspaceId !== workspaceId) {
    throw new AppError(Messages.forbidden, 403, ErrorCode.FORBIDDEN);
  }
  return tag;
}

export async function listWorkspaceTags(actor: WorkspaceActor, workspaceId: string): Promise<WorkspaceTag[]> {
  const access = await requireWorkspaceMember(actor, workspaceId);
  const db = getDb();
  const publishedUse = exists(
    db.select({ id: questionTags.questionId })
      .from(questionTags)
      .innerJoin(questions, eq(questions.id, questionTags.questionId))
      .where(and(
        eq(questionTags.tagId, tags.id),
        eq(questions.workspaceId, workspaceId),
        eq(questions.isPublished, true),
      )),
  );
  const rows = await db.select().from(tags).where(access.staff
    ? or(isNull(tags.workspaceId), eq(tags.workspaceId, workspaceId))
    : or(isNull(tags.workspaceId), and(eq(tags.workspaceId, workspaceId), publishedUse)))
    .orderBy(desc(tags.isPreset), asc(tags.name), asc(tags.id));
  return rows.map(toWorkspaceTag);
}

export async function createWorkspaceTag(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  name: string;
}) {
  await requireWorkspaceStaff(input.actor, input.workspaceId);
  const db = getDb();
  return db.transaction(async (tx) => {
    const slug = await createUniqueWorkspaceTagSlug(tx, input.workspaceId, input.name);
    const [tag] = await tx.insert(tags).values({
      workspaceId: input.workspaceId,
      name: input.name,
      slug,
      isPreset: false,
    }).returning();
    if (!tag) throw new AppError(Messages.somethingWrong, 500, ErrorCode.INTERNAL);
    return toWorkspaceTag(tag);
  });
}

export async function updateWorkspaceTag(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  tagId: string;
  name: string;
}) {
  await requireWorkspaceStaff(input.actor, input.workspaceId);
  const db = getDb();
  return db.transaction(async (tx) => {
    await requireMutableWorkspaceTag(tx, input.workspaceId, input.tagId);
    const slug = await createUniqueWorkspaceTagSlug(tx, input.workspaceId, input.name, input.tagId);
    const [tag] = await tx.update(tags).set({
      name: input.name,
      slug,
      updatedAt: new Date(),
    }).where(eq(tags.id, input.tagId)).returning();
    if (!tag) throw new AppError(Messages.tagNotFound, 404, ErrorCode.NOT_FOUND);
    return toWorkspaceTag(tag);
  });
}

export async function deleteWorkspaceTag(input: {
  actor: WorkspaceActor;
  workspaceId: string;
  tagId: string;
}) {
  await requireWorkspaceStaff(input.actor, input.workspaceId);
  const db = getDb();
  return db.transaction(async (tx) => {
    await requireMutableWorkspaceTag(tx, input.workspaceId, input.tagId);
    await tx.delete(questionTags).where(eq(questionTags.tagId, input.tagId));
    const [deleted] = await tx.delete(tags).where(eq(tags.id, input.tagId)).returning({ id: tags.id });
    if (!deleted) throw new AppError(Messages.tagNotFound, 404, ErrorCode.NOT_FOUND);
    return deleted;
  });
}

export async function validateWorkspaceTagIds(
  tx: DatabaseTransaction,
  workspaceId: string,
  tagIds: readonly string[],
) {
  const uniqueTagIds = assertDistinctTagIds(tagIds);
  if (uniqueTagIds.length === 0) return [];
  const selectedTags = await tx.select().from(tags).where(and(
    inArray(tags.id, uniqueTagIds),
    or(isNull(tags.workspaceId), eq(tags.workspaceId, workspaceId)),
  ));
  if (selectedTags.length !== uniqueTagIds.length) {
    throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
  }
  return selectedTags;
}

export async function syncQuestionTags(
  tx: DatabaseTransaction,
  workspaceId: string,
  questionId: string,
  tagIds: readonly string[],
) {
  const selectedTags = await validateWorkspaceTagIds(tx, workspaceId, tagIds);
  await tx.delete(questionTags).where(eq(questionTags.questionId, questionId));
  if (selectedTags.length > 0) {
    await tx.insert(questionTags).values(selectedTags.map((tag) => ({ questionId, tagId: tag.id })));
  }
}

export async function mapTagsForQuestionClone(
  tx: DatabaseTransaction,
  targetWorkspaceId: string,
  sourceTags: Array<WorkspaceTag>,
) {
  const localSourceTags = sourceTags.filter((tag) => !tag.isPreset);
  const existingTargetTags = localSourceTags.length === 0
    ? []
    : await tx.select().from(tags).where(and(
        eq(tags.workspaceId, targetWorkspaceId),
        inArray(tags.slug, localSourceTags.map((tag) => tag.slug)),
      ));
  const targetTagIdsBySlug = new Map(existingTargetTags.map((tag) => [tag.slug, tag.id]));
  const tagIds: string[] = [];

  for (const sourceTag of sourceTags) {
    if (sourceTag.isPreset) {
      tagIds.push(sourceTag.id);
      continue;
    }
    let targetTagId = targetTagIdsBySlug.get(sourceTag.slug);
    if (!targetTagId) {
      const [created] = await tx.insert(tags).values({
        workspaceId: targetWorkspaceId,
        name: sourceTag.name,
        slug: sourceTag.slug,
        isPreset: false,
      }).returning({ id: tags.id });
      if (!created) throw new AppError(Messages.somethingWrong, 500, ErrorCode.INTERNAL);
      targetTagId = created.id;
      targetTagIdsBySlug.set(sourceTag.slug, targetTagId);
    }
    tagIds.push(targetTagId);
  }
  return tagIds;
}
