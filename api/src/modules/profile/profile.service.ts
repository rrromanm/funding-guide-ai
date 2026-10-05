import { NotFoundError } from "../../errors.ts";
import { db } from "../../lib/db.ts";
import { type ProfileResponse, type LEGAL_STATUSES } from "./profile.schema.ts";

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
    staffCount: row.staff_count,
    adminCapacity: row.admin_capacity?.trim() || null,
    themes: labels(tags, "theme"),
    targetGroups: labels(tags, "target_group"),
  };
}

function labels(tags: { label: string; type: string }[], type: string) {
  return tags.filter((tag) => tag.type === type).map((tag) => tag.label);
}
