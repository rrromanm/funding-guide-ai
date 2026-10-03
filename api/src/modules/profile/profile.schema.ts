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
  staffCount: z.number(),
  adminCapacity: z
    .string()
    .nullable()
    .describe("Free text the admin maintains; the matcher does not read it."),
  themes: z.array(z.string()).describe("Theme tags on the profile."),
  targetGroups: z.array(z.string()).describe("Target group tags."),
});

export type ProfileResponse = z.infer<typeof profileResponse>;
