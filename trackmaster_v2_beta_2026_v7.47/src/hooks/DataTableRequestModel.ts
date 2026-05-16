export interface DataTableRequestModel {
    CustId: number;
    iDisplayStart?: number;
    iDisplayLength?: number;
    sSearch?: string;
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
    interval?: number;
    beginDate?: string;
    endDate?: string;
}