import { isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import type { ReportRow, DetailRow, ReportSortKey, DetailSortKey, BaseDetailData } from '@/types/report-types';
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

  // First, compute sessionDistance for each detail
  const withSession = details.map(detail => {
    const explicitDistance = (detail as any).sessionDistance;
    const sessionDistance = typeof explicitDistance === 'number' && !Number.isNaN(explicitDistance)
      ? explicitDistance
      : totalDuration > 0
        ? (detail.duration / totalDuration) * totalDistance
        : 0;
    return { ...detail, sessionDistance };
  });

  // Compute cumulativeDistance in chronological order (based on startTime)
  const chronological = [...withSession].sort((a, b) => a.startTime.localeCompare(b.startTime));
  let cumulative = 0;
  const withCumulative = chronological.map(d => {
    cumulative += d.sessionDistance;
    return { ...d, cumulativeDistance: cumulative };
  });

  // Now sort the final array based on the requested key. Sorting uses the already-computed cumulativeDistance when requested.
  const sorted = [...withCumulative].sort((a, b) => {
    const aValue = a[sortConfig.key as keyof typeof a];
    const bValue = b[sortConfig.key as keyof typeof b];

    // Handle undefined/null gracefully
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
    if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;

    // If values are numbers, compare numerically
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // Fallback to string compare
    const aStr = String(aValue);
    const bStr = String(bValue);
    if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
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