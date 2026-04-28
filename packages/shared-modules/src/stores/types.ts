export interface Store {
  id: string; // encId from API
  name: string;
  locationName?: string;
  storeNature?: string; // store type / nature
  status: string;
  storeLogo?: { s3path: string };
}

export interface StoreType {
  storeNature: string;
}

export interface StoreLocation {
  id: string;
  place: string;
  status: string;
}

export interface StoreFilters {
  page: number;
  pageSize: number;
  status?: string;
  locationName?: string;
  storeNature?: string;
  name?: string;
}
