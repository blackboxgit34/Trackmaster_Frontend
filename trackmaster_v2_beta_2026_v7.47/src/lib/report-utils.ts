import { isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import type { ReportRow, DetailRow, ReportSortKey, DetailSortKey } from '@/types/report-types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

export const filterReportData = (data: ReportRow[], dateRange: DateRange | undefined, selectedVehicle: string): ReportRow[] => {
  let filteredData = [...data];

  if (dateRange?.from) {
    const start = startOfDay(dateRange.from);
    const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    filteredData = filteredData.filter(item => {
      const itemDate = parseISO(item.date);
      return isWithinInterval(itemDate, { start, end });
    });
  }

  if (selectedVehicle && selectedVehicle !== 'all') {
    filteredData = filteredData.filter(item => item.vehicleId === selectedVehicle);
  }

  return filteredData;
};

export const sortReportData = (data: ReportRow[], sortConfig: { key: ReportSortKey; direction: 'asc' | 'desc' }): ReportRow[] => {
  const sortedData = [...data];
  sortedData.sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    // Robust date sorting
    if (sortConfig.key === 'date') {
      const dateA = parseISO(aValue as string).getTime();
      const dateB = parseISO(bValue as string).getTime();
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
  return sortedData;
};

export const sortAndCalculateDetails = (details: BaseDetailData[], totalDistance: number, sortConfig: { key: DetailSortKey; direction: 'asc' | 'desc' }): DetailRow[] => {
  const totalDuration = details.reduce((sum, d) => sum + d.duration, 0);

  // Step 1: Initial calculation (chronological)
  const chronologicallyCalculated = [...details]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map(detail => {
      // NOTE: This is placeholder logic for mock data as pointed out.
      // In a real scenario, this would come from actual trip segment data.
      const sessionDistance = totalDuration > 0 ? (detail.duration / totalDuration) * totalDistance : 0;
      return { ...detail, sessionDistance, cumulativeDistance: 0 };
    });

  // Step 2: Sort based on user's choice
  const sorted = [...chronologicallyCalculated].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Step 3: Recalculate cumulative distance based on the final sorted order
  let cumulativeDistance = 0;
  return sorted.map(detail => {
    cumulativeDistance += detail.sessionDistance;
    return { ...detail, cumulativeDistance };
  });
};

const generateExportData = (data: ReportRow[]) => {
  return data.map(row => ({
    'Date': row.date,
    'Vehicle ID': row.vehicleId,
    'Vehicle Name': row.vehicleName,
    'Distance (km)': (row.distance ?? 0).toFixed(1),
  }));
};

export const handleExportPDF = (data: ReportRow[]) => {
  const exportData = generateExportData(data);
  if (exportData.length === 0) return;
  const doc = new jsPDF();
  const tableColumn = Object.keys(exportData[0]);
  const tableRows = exportData.map(row => Object.values(row).map(String));
  doc.text("Distance Report", 14, 15);
  autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
  doc.save(`distance-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const handleExportCSV = (data: ReportRow[]) => {
  const exportData = generateExportData(data);
  if (exportData.length === 0) return;
  const csv = Papa.unparse(exportData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `distance-report-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url); // Clean up blob URL
};