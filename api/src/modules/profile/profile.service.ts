import { sql } from "kysely";
import { NotFoundError } from "../../errors.ts";
import { db } from "../../lib/db.ts";
import type { TagType } from "../../lib/db-types.ts";
import {
  type ProfileResponse,
  type LEGAL_STATUSES,
  type UpdateProfileBody,
} from "./profile.schema.ts";

const PROFILE_ID = 1;

export async function findProfile(): Promise<ProfileResponse> {
  const row = await db
    .selectFrom("org_profile")
    .select([
      "id",
      "name",
      "legal_status",
      "city",
      "country",
      "founded_year",
      "staff_count",
      "admin_capacity",
    ])
    .where("id", "=", PROFILE_ID)
    .executeTakeFirst();

  if (!row) throw new NotFoundError("Profile not found");

  const tags = await db
    .selectFrom("org_profile_tag")
    .innerJoin("tag", "tag.id", "org_profile_tag.tag_id")
    .select(["tag.label", "tag.type"])
    .where("org_profile_tag.org_profile_id", "=", PROFILE_ID)
    .orderBy("tag.label")
    .execute();

  return {
    id: row.id,
    name: row.name,
    legalStatus: row.legal_status as (typeof LEGAL_STATUSES)[number],
    city: row.city,
    country: row.country,
    foundedYear: row.founded_year,
    staffCount: row.staff_count,
    adminCapacity: row.admin_capacity?.trim() || null,
    themes: labels(tags, "theme"),
    targetGroups: labels(tags, "target_group"),
  };
}

export async function updateProfile(
  body: UpdateProfileBody,
): Promise<ProfileResponse> {
  const { themes, targetGroups, ...fields } = body;

  await db.transaction().execute(async (trx) => {
    if (Object.keys(fields).length) {
      await trx
        .updateTable("org_profile")
        .set({
          staff_count: fields.staffCount,
          admin_capacity: fields.adminCapacity,
        })
        .where("id", "=", PROFILE_ID)
        .execute();
    }

    if (themes) await replaceTags(trx, "theme", themes);
    if (targetGroups) await replaceTags(trx, "target_group", targetGroups);
  });

  return findProfile();
}

async function replaceTags(trx: typeof db, type: TagType, labels: string[]) {
  await trx
    .deleteFrom("org_profile_tag")
    .where("org_profile_id", "=", PROFILE_ID)
    .where(
      "tag_id",
      "in",
      trx.selectFrom("tag").select("id").where("type", "=", type),
    )
    .execute();

  if (!labels.length) return;

  await trx
    .insertInto("tag")
    .values(labels.map((label) => ({ label, type })))
    .onConflict((oc) => oc.columns(["label", "type"]).doNothing())
    .execute();

  await trx
    .insertInto("org_profile_tag")
    .columns(["org_profile_id", "tag_id"])
    .expression(
      trx
        .selectFrom("tag")
        .select([sql.lit(PROFILE_ID).as("org_profile_id"), "id"])
        .where("type", "=", type)
        .where("label", "in", labels),
    )
    .execute();
}

function labels(tags: { label: string; type: string }[], type: string) {
  return tags.filter((tag) => tag.type === type).map((tag) => tag.label);
}
