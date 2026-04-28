import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { currentFuelLevelData, vehicles } from '@/data/mockData';
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import WhatsappPopup from '../WhatsappPopup';
import { VehicleCombobox } from '../VehicleCombobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { useSettings } from '@/context/SettingsContext';

type ReportData = (typeof currentFuelLevelData)[0];
type ReportDataKey = keyof ReportData | 'fuelLiters';

const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'dateTime', label: 'Date & Time' },
  { key: 'vehicleId', label: 'Vehicle ID' },
  { key: 'vehicleName', label: 'Vehicle Name' },
  { key: 'location', label: 'Location' },
  { key: 'fuelLevel', label: 'Fuel Level (%)' },
  { key: 'fuelLiters', label: 'Fuel Level (L)' },
];

const SortableHeader = ({
  children,
  isSorted,
  sortDirection,
  onClick,
}: {
  children: React.ReactNode;
  isSorted?: boolean;
  sortDirection?: 'asc' | 'desc';
  onClick: () => void;
}) => (
  <TableHead
    className="cursor-pointer px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
    onClick={onClick}
  >
    <div className="flex items-center">
      {children}
      {isSorted &&
        (sortDirection === 'asc' ? (
          <ArrowUp className="h-4 w-4 ml-1.5" />
        ) : (
          <ArrowDown className="h-4 w-4 ml-1.5" />
        ))}
    </div>
  </TableHead>
);

const CurrentFuelLevelReportTable = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');
  const levelFromUrl = searchParams.get('level');
  const { fuelThresholds } = useSettings();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: ReportDataKey;
    direction: 'asc' | 'desc';
  }>({ key: 'dateTime', direction: 'desc' });

  const [selectedVehicle, setSelectedVehicle] = useState(vehicleFromUrl || 'all');
  const [fuelLevelFilter, setFuelLevelFilter] = useState(levelFromUrl || 'all');

  useEffect(() => {
    if (levelFromUrl && ['normal', 'low'].includes(levelFromUrl)) {
      setFuelLevelFilter(levelFromUrl);
    }
  }, [levelFromUrl]);

  const handleVehicleChange = (value: string) => {
    setSelectedVehicle(value);
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      newParams.delete('vehicle');
    } else {
      newParams.set('vehicle', value);
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleLevelChange = (value: string) => {
    setFuelLevelFilter(value);
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      newParams.delete('level');
    } else {
      newParams.set('level', value);
    }
    setSearchParams(newParams, { replace: true });
  };

  const filteredData = useMemo(() => {
    let data = [...currentFuelLevelData];

    if (selectedVehicle !== 'all') {
      data = data.filter(item => item.vehicleId === selectedVehicle.toUpperCase());
    }

    switch (fuelLevelFilter) {
      case 'low':
        data = data.filter(item => item.fuelLiters < fuelThresholds.low);
        break;
      case 'normal':
        data = data.filter(item => item.fuelLiters >= fuelThresholds.low);
        break;
      default:
        break;
    }

    return data;
  }, [selectedVehicle, fuelLevelFilter, fuelThresholds]);

  const sortedData = useMemo(() => {
    const sortableData = [...filteredData];
    if (sortConfig) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof typeof a];
        const bValue = b[sortConfig.key as keyof typeof b];
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [filteredData, sortConfig]);

  const handleSort = (key: ReportDataKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(0);
  };

  const generateExportData = () => {
    return sortedData.map(row => ({
      'Date & Time': row.dateTime,
      'Vehicle ID': row.vehicleId,
      'Vehicle Name': row.vehicleName,
      'Location': row.location,
      'Fuel Level (%)': row.fuelLevel,
      'Fuel Level (L)': row.fuelLiters.toFixed(1),
    }));
  };

  const handleExportPDF = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    const doc = new jsPDF();
    
    const tableColumn = Object.keys(exportData[0]);
    const tableRows = exportData.map(row => Object.values(row).map(String));

    doc.text("Current Fuel Level Report", 14, 15);
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    
    doc.save(`current-fuel-level-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportCSV = () => {
    const exportData = generateExportData();
    if (exportData.length === 0) return;
    
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `current-fuel-level-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const firstRowIndex = page * rowsPerPage + 1;
  const lastRowIndex = Math.min(
    (page + 1) * rowsPerPage,
    sortedData.length
  );

  const getFuelLevelColorClass = (level: number) => {
    if (level <= 20) return 'bg-red-500';
    if (level <= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">
            Current Fuel Level Report
          </CardTitle>
          <CardDescription>
            Overview of vehicle fuel levels.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
          <Select value={fuelLevelFilter} onValueChange={handleLevelChange}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filter by fuel level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fuel Levels</SelectItem>
              <SelectItem value="low">Low Fuel (&lt; {fuelThresholds.low}L)</SelectItem>
              <SelectItem value="normal">Normal Fuel (&gt;= {fuelThresholds.low}L)</SelectItem>
            </SelectContent>
          </Select>
          <VehicleCombobox
            vehicles={vehicles}
            value={selectedVehicle}
            onChange={handleVehicleChange}
            className="w-full sm:w-[180px]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleExportPDF}>
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <WhatsappPopup />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                {headers.map((header) => (
                  <SortableHeader
                    key={header.key}
                    onClick={() => handleSort(header.key as ReportDataKey)}
                    isSorted={sortConfig.key === header.key}
                    sortDirection={
                      sortConfig.key === header.key
                        ? sortConfig.direction
                        : undefined
                    }
                  >
                    {header.label}
                  </SortableHeader>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row) => (
                <TableRow
                  key={row.id}
                  className="bg-card hover:bg-muted/50 border-b"
                >
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {row.dateTime}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {row.vehicleId}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-semibold">
                    {row.vehicleName}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {row.location}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full">
                        <div
                          className={`h-full rounded-full ${getFuelLevelColorClass(
                            row.fuelLevel
                          )}`}
                          style={{ width: `${row.fuelLevel}%` }}
                        />
                      </div>
                      <span>{row.fuelLevel}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {row.fuelLiters.toFixed(1)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={String(rowsPerPage)}
            onValueChange={(value) => {
              setRowsPerPage(Number(value));
              setPage(0);
            }}
          >
            <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary">
              <SelectValue placeholder={rowsPerPage} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {firstRowIndex}-{lastRowIndex} of {sortedData.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent"
              onClick={() => setPage(0)}
              disabled={page === 0}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-accent"
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default CurrentFuelLevelReportTable;