import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, CalendarIcon, ChevronDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, subDays, subMonths, format } from 'date-fns';
import { cn } from '@/lib/utils'; // excel and pdf download 06.06.2026
import { VehicleCombobox } from '../VehicleCombobox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import WhatsappPopup from '../WhatsappPopup';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

import { DateRangePicker } from '@/components/ui/date-range-picker';//23.06.2026
import { API_BASE_URL } from '@/config/Api';
//import { downloadReport } from '@/hooks/downloadReport'; //
import type { DataTableRequestModel } from '@/hooks/DataTableRequestModel';
import { useReportDownload } from '@/hooks/useApi';//excel 06.06.2026



type IgnitionDetail = {
  ignitionOnTime: string;
  ignitionOffTime: string;
  sLocation: string;
  eLocation: string;
  duration: string;
};

type IgnitionVehicle = {
  bbid: string;
  vehicleName: string;
  driverName: string;
  ignitionOnOffCounter: string;
  totalIgnitionTime: string;
  objIgnitionStatusReport: IgnitionDetail[];
};


type ReportDataKey =
  | "vehicleName"
  | "driverName"
  | "ignitionOnOffCounter"
  | "totalIgnitionTime";
const custId = JSON.parse(localStorage.getItem("trackmaster-auth") ?? "{}")?.custId; // get custid

const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'vehicleName', label: 'Vehicle No' },
  { key: 'driverName', label: 'Driver Name' },
  { key: 'ignitionOnOffCounter', label: 'Ignition On Count' },
  { key: 'totalIgnitionTime', label: 'Ignition On Duration' },
];



const IgnitionOnOffAnalysisTable = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [date, setDate] = useState<DateRange | undefined>({ from: subWeeks(new Date(), 1), to: new Date() });
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [vehicleList, setVehicleList] = useState<any[]>([]);
  const [reportData, setReportData] = useState<IgnitionVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) newSet.delete(rowId);
      else newSet.add(rowId);
      return newSet;
    });
  };

  useEffect(() => {
    if (!custId) return;
    fetch(
      `${API_BASE_URL}/Dashboard/GetAllVehicleListByCustId?userid=${custId}`
    )
      .then(async (res) => {
        const text = await res.text();
        if (!text) return [];
        return JSON.parse(text);
      })
      .then((data) => {
        const vehicles = data?.data || [];
        const formatted = [
          { label: "All", value: "all" },
          ...vehicles.map((v: any) => ({
            label: v.vehName,
            value: v.bbid,
          })),
        ];
        setVehicleList(formatted);
      });
  }, []);

  const getIgnitionReport = async () => {
    debugger
    try {
      setLoading(true);
      const auth = JSON.parse(
        localStorage.getItem("trackmaster-auth") || "{}"
      );

      const lowerBand = page * rowsPerPage;
      const upperBand = rowsPerPage;
      const requestModel: DataTableRequestModel = {
        CustId: auth.custId,
        sEcho: 1,
        iDisplayStart: lowerBand,
        iDisplayLength: upperBand,
        sSearch: search?.trim() || "",
        sortColumn: "vehicleName",
        sortDirection: "asc",
      };

      const params = new URLSearchParams({
        CustId: String(requestModel.CustId),
        sEcho: String(requestModel.sEcho),
        iDisplayStart: String(requestModel.iDisplayStart),
        iDisplayLength: String(requestModel.iDisplayLength),
        sSearch: selectedVehicle !== "all" ? vehicleList.find(v => v.value === selectedVehicle)?.label || "" : "",
        sortColumn: requestModel.sortColumn || "",
        sortDirection: requestModel.sortDirection || "",
        beginDate: date?.from ? date.from.toLocaleString("en-US").replace(",", "") : "",
        endDate: date?.to ? date.to.toLocaleString("en-US").replace(",", "") : "",
        bbid: selectedVehicle === "all" ? "null" : selectedVehicle,
        reportName: "null",
      });
      const response = await fetch(
        `${API_BASE_URL}/Reports/GetConsolidatedIgnitionStatus?${params.toString()}`
      );
      const data = await response.json();
      setReportData(
        data?.aaData || []
      );

      setTotalRecords(
        data?.iTotalRecords || 0
      );

    }
    catch (error) {
      console.error(error);
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getIgnitionReport();
  }, [page, rowsPerPage, selectedVehicle, date]);

 

  const paginatedData = reportData;
  const totalPages = Math.ceil(totalRecords / rowsPerPage);



  const requestModel = {
    CustId: custId,
    sEcho: 1,
    sSearch:
      selectedVehicle !== "all"
        ? vehicleList.find(v => v.value === selectedVehicle)?.label || ""
        : "",
    sortColumn: "vehicleName",
    sortDirection: "asc",
  };

  const extraParams = {
    beginDate: date?.from
      ? date.from.toLocaleString("en-US").replace(",", "")
      : "",
    endDate: date?.to
      ? date.to.toLocaleString("en-US").replace(",", "")
      : "",
    bbid: selectedVehicle === "all" ? "null" : selectedVehicle,
    reportName: "null",
  };

  const {
    exportExcel,
    exportPdf,
  } = useReportDownload(
    "/Reports/GetConsolidatedIgnitionStatus",
    requestModel,
    extraParams
  );

  const handlePdfExport = async () => {
    setLoading(true);
    try {
      await exportPdf();
    } finally {
      setLoading(false);
    }
  };

  const handleExcelExport = async () => {
    setLoading(true);
    try {
      await exportExcel();
    } finally {
      setLoading(false);
    }
  };

  return (

    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">

          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" />

          <div className="relative bg-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-scaleIn">
            <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full" />
            <span className="text-sm font-medium">Please wait...</span>
          </div>

        </div>
      )}

      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">Ignition On/Off Analysis</CardTitle>
            <CardDescription>Detailed breakdown of vehicle ignition cycles.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
           
            <DateRangePicker
              date={date}
              setDate={setDate}
            />
            <VehicleCombobox vehicles={vehicleList} value={selectedVehicle} onChange={setSelectedVehicle} className="w-full sm:w-[180px]" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                <DropdownMenuItem>Export as Excel</DropdownMenuItem> */}
                {/* excel and pdf download 06.06.2026 */}
                <DropdownMenuItem onClick={handlePdfExport}>
                  Export as PDF
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleExcelExport}>
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
                    <TableHead key={header.key} className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{header.label}
                    </TableHead>
                  ))}
                  <TableHead className="px-6 py-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((row) => {
                    const isExpanded = expandedRows.has(row.bbid); const sortedDetails = row.objIgnitionStatusReport || [];
                    return (
                      <React.Fragment key={row.bbid}>
                        <TableRow className="bg-card hover:bg-muted/50 border-b">
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">{row.vehicleName}</TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.driverName || 'N/A'}</TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.ignitionOnOffCounter}</TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{row.totalIgnitionTime}</TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            {/* <Button variant="link" onClick={() => toggleRow(row.bbid)} className="font-medium text-brand-blue dark:text-blue-400 p-0 h-auto flex items-center gap-1">
                              Details <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} /> */}
                            <Button
                              variant="link"
                              onClick={() => toggleRow(row.bbid)}
                              className="font-medium text-brand-blue dark:text-blue-400 p-0 h-auto flex items-center gap-1 whitespace-nowrap"
                            >
                              Details
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                                  }`}
                              />

                            </Button>
                          </TableCell>
                        </TableRow>
                        {
                          isExpanded && (
                            <TableRow className="bg-muted/20 hover:bg-muted/20">
                              <TableCell colSpan={headers.length + 1} className="p-0">
                                <div className="bg-muted/50 p-8">
                                  <div className="bg-card rounded-lg shadow-sm h-full flex flex-col overflow-hidden">
                                    <div className="p-6 border-b">
                                      <h5 className="text-lg font-semibold text-foreground">Ignition Log for {row.vehicleName}</h5>
                                      <p className="text-sm text-muted-foreground">Detailed ignition cycle breakdown for the selected period.</p>
                                    </div>
                                    <div className="p-6">
                                      {/* <ScrollArea className="h-[240px] pr-4"> */}
                                      <ScrollArea
                                        className={`${sortedDetails.length > 5
                                          ? "h-[400px]"
                                          : ""
                                          } pr-4`}
                                      >
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Ignition On Time</TableHead>
                                              <TableHead>Ignition Off Time</TableHead>
                                              <TableHead>Ignition On Location</TableHead>
                                              <TableHead>Ignition Off Location</TableHead>
                                              <TableHead>Duration</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {sortedDetails.length > 0 ? (
                                              sortedDetails.map((detail, index) => (
                                                <TableRow key={index}>
                                                  {/* <TableCell className="font-mono text-sm">{detail.ignitionOnTime}</TableCell>
                                              <TableCell className="font-mono text-sm">{detail.ignitionOffTime}</TableCell> */}
                                                  <TableCell className="font-mono text-sm">
                                                    {detail.ignitionOnTime
                                                      ? format(new Date(detail.ignitionOnTime), "MMM dd yyyy hh:mm a")
                                                      : "-"}
                                                  </TableCell>

                                                  <TableCell className="font-mono text-sm">
                                                    {detail.ignitionOffTime
                                                      ? format(new Date(detail.ignitionOffTime), "MMM dd yyyy hh:mm a")
                                                      : "-"}
                                                  </TableCell>
                                                  {/* <TableCell className="text-sm truncate">{detail.sLocation}</TableCell>
                                                <TableCell className="text-sm truncate">{detail.eLocation}</TableCell> */}
                                                  <TableCell className="text-sm max-w-[300px] break-words whitespace-normal">
                                                    {detail.sLocation}
                                                  </TableCell>

                                                  <TableCell className="text-sm max-w-[300px] break-words whitespace-normal">
                                                    {detail.eLocation}
                                                  </TableCell>
                                                  <TableCell className="text-sm">{detail.duration}</TableCell>
                                                </TableRow>
                                              ))
                                            ) : (
                                              <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                  No ignition details available for this period.
                                                </TableCell>
                                              </TableRow>
                                            )}
                                          </TableBody>
                                        </Table>
                                      </ScrollArea>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        }
                      </React.Fragment>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={headers.length + 1}
                      className="text-center py-10"
                    >
                      No Data Found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>

            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={String(rowsPerPage)} onValueChange={(value) => { setRowsPerPage(Number(value)); setPage(0); }}>
              <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary"><SelectValue placeholder={rowsPerPage} /></SelectTrigger>
              <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{totalRecords === 0 ? "0-0" : `${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, totalRecords)}`}{" "}of {totalRecords}
            </span>
            <div className="flex items-center gap-1">
              {/* First Page */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(0)}
                disabled={page === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>

              {/* Previous */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Next */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {/* Last Page */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

          </div>
        </CardFooter>
      </Card >
    </>
  );
};

export default IgnitionOnOffAnalysisTable;