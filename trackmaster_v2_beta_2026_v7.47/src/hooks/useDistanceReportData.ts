import { useEffect, useState } from 'react';
import { format, endOfDay, startOfDay } from 'date-fns';
import { API_BASE_URL } from '@/config/Api';
import type { DateRange } from 'react-day-picker';
import type { DataTableRequestModel } from '@/hooks/DataTableRequestModel';
import type { ReportRow, BaseDetailData, ReportSortKey } from '@/types/report-types';

const parseDurationToHours = (value: string | number | undefined): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (!value) {
    return 0;
  }

  const normalized = String(value).trim();
  if (normalized.includes(':')) {
    const parts = normalized.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] + parts[1] / 60 + parts[2] / 3600;
    }
    if (parts.length === 2) {
      return parts[0] + parts[1] / 60;
    }
  }

  const numberValue = parseFloat(normalized.replace(',', '.'));
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numberValue = parseFloat(value.replace(',', '.'));
    return Number.isFinite(numberValue) ? numberValue : 0;
  }
  return 0;
};

const formatDateTime = (date: Date, endOfDayFlag = false): string => {
  return format(endOfDayFlag ? endOfDay(date) : startOfDay(date), 'yyyy-MM-dd HH:mm:ss');
};

interface DistanceReportRequestOptions {
  dateRange?: DateRange;
  selectedVehicle: string;
  pageIndex: number;
  pageSize: number;
  sortConfig: { key: ReportSortKey; direction: 'asc' | 'desc' };
}

export const useDistanceReportData = ({
  dateRange,
  selectedVehicle,
  pageIndex,
  pageSize,
  sortConfig,
}: DistanceReportRequestOptions) => {
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [detailRows, setDetailRows] = useState<BaseDetailData[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        const auth = JSON.parse(localStorage.getItem('trackmaster-auth') || '{}');
        const custId = Number(auth.custId ?? 0) || 0;

        const begin = dateRange?.from ? startOfDay(dateRange.from) : startOfDay(new Date());
        const end = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(dateRange?.from ?? new Date());

        const mapSortKeyToApiColumn = (key: string): string => {
          switch (key) {
            case 'date':
              return 'Date';
            case 'vehicleId':
              return 'BBID';
            case 'vehicleName':
              return 'VehName';
            case 'distance':
              return 'Distance';
            default:
              return 'Date';
          }
        };

        const requestModel: DataTableRequestModel = {
          CustId: custId,
          iDisplayStart: pageIndex * pageSize,
          iDisplayLength: pageSize,
          sortColumn: mapSortKeyToApiColumn(String(sortConfig.key)),
          sortDirection: sortConfig.direction,
          sSearch: selectedVehicle && selectedVehicle !== 'all' ? selectedVehicle : undefined,
          beginDate: formatDateTime(begin),
          endDate: formatDateTime(end, true),
        };

        const response = await fetch(`${API_BASE_URL}/Reports/GetDistanceReportData`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestModel),
        });

        if (!response.ok) {
          throw new Error(`Distance report API error: ${response.status}`);
        }

        const result = await response.json();
        const data = Array.isArray(result.data) ? result.data : [];

        const getProp = (obj: any, prop: string) => {
          if (!obj) return undefined;
          if (prop in obj) return obj[prop];
          const lowerFirst = prop.charAt(0).toLowerCase() + prop.slice(1);
          if (lowerFirst in obj) return obj[lowerFirst];
          const upper = prop.toUpperCase();
          if (upper in obj) return obj[upper];
          const lower = prop.toLowerCase();
          if (lower in obj) return obj[lower];
          return undefined;
        };

        const rows: ReportRow[] = data.map((item: any, index: number) => {
          const rawDate = getProp(item, 'Date');
          const date = rawDate ? new Date(rawDate) : new Date();
          const formattedDate = format(date, 'yyyy-MM-dd');
          const distanceValue = parseNumber(getProp(item, 'Distance'));

          return {
            id: `${getProp(item, 'BBID') ?? 'unknown'}-${formattedDate}-${index}`,
            date: formattedDate,
            vehicleId: getProp(item, 'BBID') ?? '',
            vehicleName: getProp(item, 'VehName') ?? '',
            distance: distanceValue,
          };
        });

        const details: BaseDetailData[] = data.flatMap((item: any, rowIndex: number) => {
          const rawDate = getProp(item, 'Date');
          const date = rawDate ? new Date(rawDate) : new Date();
          const formattedDate = format(date, 'yyyy-MM-dd');
          const vehicleId = getProp(item, 'BBID') ?? '';
          const tripDetailsRaw = getProp(item, '_distanceReportSubDataModel') ?? [];

          const tripDetails = Array.isArray(tripDetailsRaw) ? tripDetailsRaw : [];

          return tripDetails.map((sub: any, detailIndex: number) => ({
            id: `${vehicleId}-${formattedDate}-${rowIndex}-${detailIndex}`,
            vehicleId,
            date: formattedDate,
            startTime: sub.StartTime ?? sub.startTime ?? '',
            endTime: sub.EndTime ?? sub.endTime ?? '',
            duration: parseDurationToHours(sub.Duration ?? sub.duration),
            location: sub.StartLocation ?? sub.startLocation ?? '',
            sessionDistance: parseNumber(sub.EstimateDistance ?? sub.estimateDistance ?? sub.EstimateDistance),
          }));
        });

        setReportRows(rows);
        setDetailRows(details);
        setTotalRows(Number(result.count) || rows.length);
      } catch (error) {
        console.error('Failed to load distance report data', error);
        setReportRows([]);
        setDetailRows([]);
        setTotalRows(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange, selectedVehicle, pageIndex, pageSize, sortConfig]);

  return {
    reportRows,
    detailRows,
    totalRows,
    isLoading,
  };
};