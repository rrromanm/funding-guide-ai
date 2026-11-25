import type { FundingCallListItemDto } from "./calls";

export interface Notification {
  id: number;
  message: string;
  createdAt: string;
  read: boolean;
  fundingOpportunities: FundingCallListItemDto[];
}

export type NotificationItemDto = Omit<Notification, "fundingOpportunities">;

export interface NotificationListResponseDto {
  items: NotificationItemDto[];
}

export type NotificationDetailDto = Notification;
