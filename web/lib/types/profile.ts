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

export interface OrgProfileDto {
  id: number;
  name: string;
  legalStatus: string;
  city: string;
  country: string;
  foundedYear: number | null;
  staffCount: number;
  adminCapacity: string | null;
  themes: string[];
  targetGroups: string[];
}
