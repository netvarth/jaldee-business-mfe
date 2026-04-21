export type LeadListFilters = {
  search?: string;
  status?: string;
  channelUid?: string;
  page?: number;
  pageSize?: number;
};

export type LeadSummary = {
  uid: string;
  referenceNo?: string;
  consumerFirstName?: string;
  consumerLastName?: string;
  consumerPhone?: string;
  consumerEmail?: string;
  internalStatus?: string;
  channelName?: string;
  locationName?: string;
  ownerName?: string;
  leadDate?: string;
};

export type LeadEntityFormMode = "create" | "update";
