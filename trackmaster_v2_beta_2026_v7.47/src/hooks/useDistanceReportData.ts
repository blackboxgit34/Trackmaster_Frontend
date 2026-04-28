import { useMemo } from 'react';
import { consolidatedReportTableData, workingHourDetails } from '@/data/mockData';
import type { ReportRow, BaseDetailData } from '@/types/report-types';

// This hook encapsulates data fetching.
// Currently, it returns mock data. In the future, it can be updated
// to fetch data from an API without changing the UI components.
export const useDistanceReportData = () => {
  const reportRows: ReportRow[] = useMemo(() => {
    return consolidatedReportTableData.map(d => ({
      ...d,
      distance: d.distance ?? 0, // Ensure distance is always a number
    }));
  }, []);

  const detailRows: BaseDetailData[] = useMemo(() => workingHourDetails, []);

  return {
    reportRows,
    detailRows,
    isLoading: false, // Will be replaced by API loading state
  };
};