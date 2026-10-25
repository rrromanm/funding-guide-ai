import { z } from "zod";

export const LEGAL_STATUSES = [
  "nonprofit_association",
  "foundation",
  "company",
  "informal_group",
] as const;

export const profileResponse = z.object({
  id: z.number(),
  name: z.string(),
  legalStatus: z.enum(LEGAL_STATUSES),
  city: z.string(),
  country: z.string(),
  foundedYear: z.number().nullable(),
  staffCount: z.number(),
  adminCapacity: z
    .string()
    .nullable()
    .describe("Free text the admin maintains; the matcher does not read it."),
  themes: z.array(z.string()).describe("Theme tags on the profile."),
  targetGroups: z.array(z.string()).describe("Target group tags."),
});

export type ProfileResponse = z.infer<typeof profileResponse>;

const label = z.string().trim().min(1).max(100);

export const updateProfileBody = z
  .object({
    staffCount: z.number().int().min(0),
    adminCapacity: z
      .string()
      .trim()
      .max(2000)
      .transform((text) => text || null)
      .nullable(),
    themes: z.array(label).max(50).describe("Replaces every theme tag."),
    targetGroups: z
      .array(label)
      .max(50)
      .describe("Replaces every target group tag."),
  })
  .partial()
  .strict();

export type UpdateProfileBody = z.infer<typeof updateProfileBody>;
