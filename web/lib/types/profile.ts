export type TagType = "Theme" | "TargetGroup" | "Sector" | "Country" | "Other";

export interface Tag {
  id: string;
  value: string;
  type: TagType;
}

export interface OrgProfile {
  id: string;
  name: string;
  legalStatus: string;
  city: string;
  country: string;
  staffCount: number;
  administrativeCapacity: string;
  themes: Tag[];
  targetGroups: Tag[];
}
