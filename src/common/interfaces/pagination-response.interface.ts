export interface PaginationResponse {
  items: any[];
  currentPage: number;
  lastPage: number;
  itemsPerPage: number;
  pageItems: number;
  total: number;
  timestamp: string;
}
