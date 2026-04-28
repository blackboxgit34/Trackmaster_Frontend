import type { consolidatedReportTableData, workingHourDetails } from '@/data/mockData';

// Base types from mock data
export type BaseReportData = (typeof consolidatedReportTableData)[number];
export type BaseDetailData = (typeof workingHourDetails)[number];

// Enriched types for the component
export type ReportRow = BaseReportData & {
  distance: number;
};

export type DetailRow = BaseDetailData & {
  sessionDistance: number;
  cumulativeDistance: number;
};

// Strict sort keys
export type ReportSortKey = keyof ReportRow;
export type DetailSortKey = 'startTime' | 'endTime' | 'duration' | 'sessionDistance' | 'cumulativeDistance' | 'location';