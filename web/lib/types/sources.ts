export interface FundingSource {
  id: string;
  name: string;
  type: string;
  url?: string;
}

export interface SourceCounts {
  total: number;
  relevant: number;
  open: number;
  closed: number;
}

export interface SourceListItem {
  id: number;
  name: string;
  sourceType: string | null;
  baseUrl: string | null;
  lastChecked: string | null;
  counts: SourceCounts;
}

export interface SourceListResponse {
  items: SourceListItem[];
}
