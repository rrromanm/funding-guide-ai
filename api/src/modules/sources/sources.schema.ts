import { z } from "zod";

// Responses

export const sourceListItem = z.object({
  key: z.string(),
  name: z.string(),
  sourceType: z.string().nullable(),
  baseUrl: z.string().nullable(),
  lastChecked: z
    .string()
    .nullable()
    .describe("When a scraper run last visited this source."),
  counts: z
    .object({
      total: z.number(),
      relevant: z.number(),
      open: z.number(),
      closed: z.number(),
    })
    .describe("Calls from this source. Scraped info pages are not counted."),
});

export const sourceListResponse = z.object({
  items: z.array(sourceListItem),
});

export type SourceListItem = z.infer<typeof sourceListItem>;
export type SourceListResponse = z.infer<typeof sourceListResponse>;
