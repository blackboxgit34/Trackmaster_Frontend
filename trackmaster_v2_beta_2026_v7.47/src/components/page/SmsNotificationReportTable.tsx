import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { notificationTypes, type NotificationData } from '@/data/notificationData';// neha k
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, FileText, FileSpreadsheet, ChevronsUpDown, } from 'lucide-react';
import { DateRange } from 'react-day-picker';
//import { subWeeks } from 'date-fns';
import { subWeeks, subDays, subMonths,startOfDay, format,endOfDay } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import WhatsappPopup from '../WhatsappPopup';
import { VehicleCombobox } from '../VehicleCombobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/config/Api';
//========== searchable dropdown ==================//
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandInput, CommandItem, } from '@/components/ui/command';
import { Check } from 'lucide-react';
import type { DataTableRequestModel } from '@/hooks/DataTableRequestModel';
import { useReportDownload, useRawVehicleList } from "@/hooks/useApi";
//========== searchable dropdown ==================//

type ReportDataKey = keyof NotificationData;
const custId = JSON.parse(localStorage.getItem("trackmaster-auth") ?? "{}")?.custId; // get custid


const headers: { key: ReportDataKey; label: string }[] = [
  { key: 'vehicleName', label: 'Vehicle No' },
  { key: 'messageDate', label: 'Message Date' },
  { key: 'messageType', label: 'Type' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'message', label: 'Message' },
  { key: 'androidStatus', label: 'Android Status' },
  { key: 'iosStatus', label: 'iOS Status' },
];

const SortableHeader = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <TableHead
    className="cursor-pointer px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
    onClick={onClick}
  >
    <div className="flex items-center gap-2">
      {children}
    </div>
  </TableHead>
); // neha k remove sort for columns

const StatusBadge = ({ status }: { status: string }) => {
  const variant = {
    'Delivered': 'success',
    'Read': 'success',
    'Sent': 'default',
    'Failed': 'destructive',
  }[status] || 'secondary';

  return <Badge variant={
    variant as
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
  }>{status}</Badge>;
};
const sortMap: any = {
  vehicleName: "vehicleName",
  messageDate: "messageDate",
  messageType: "messageType",
  mobile: "mobile",
};

const SmsNotificationReportTable = () => {
  const [messageTypeOpen, setMessageTypeOpen] = useState(false);
  const { data: rawVehicleList } = useRawVehicleList(); // neha k
  const vehicleList = useMemo(
    () => [
      { label: 'All', value: 'all' },
      ...(rawVehicleList || []).map((v: any) => ({
        label: v.vehName,
        value: v.vehName, // neha k
      })),
    ],
    [rawVehicleList]
  );
  const [messageTypeList, setMessageTypeList] = useState<any[]>([]); // neha k
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: ReportDataKey;
    direction: "asc" | "desc";
  }>({
    key: "messageDate",
    direction: "desc",
  });

  // neha k
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<ReportDataKey>("messageDate");
  const [sortDirection, setSortDirection] = useState("desc");
  //const [date, setDate] = useState<DateRange | undefined>({ from: subWeeks(new Date(), 1), to: new Date() });
  //const [date, setDate] = useState<DateRange | undefined>({ from: new Date(), to: new Date(), });
  const [date, setDate] = useState<DateRange | undefined>({from: startOfDay(new Date()), to: new Date(),}); //30.06.2026
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [messageTypeFilter, setMessageTypeFilter] = useState('0');// neha k 22.05.2026
  const [notificationTypeFilter, setNotificationTypeFilter] = useState('1');
  const [reportData, setReportData] = useState<NotificationData[]>([]); //neha k 
  const [loading, setLoading] = useState(false); //neha k 
  //const [downloading, setDownloading] = useState(false);// exceland pdf
  const [totalRecords, setTotalRecords] = useState(0); // neha k
  // neha k bind data table 
  const getMessageReports = async () => {
    debugger

    try {
      setLoading(true);
      console.log("Start Date:", date?.from);
      console.log("End Date:", date?.to);
      const auth = JSON.parse(
        localStorage.getItem("trackmaster-auth") || "{}"
      );
      const lowerBand = page * rowsPerPage;
      const upperBand = lowerBand + rowsPerPage;
      const requestModel: DataTableRequestModel = {
        CustId: auth.custId,
        sEcho: 1,
        iDisplayStart: lowerBand,
        iDisplayLength: upperBand,
        sSearch: search?.trim() || "",
        sortColumn: sortMap[sortConfig.key],
        sortDirection: sortConfig.direction,
      };
      //typeid 2
      const typeId = notificationTypeFilter === "0" ? 0 : Number(notificationTypeFilter);
      console.log("notificationTypeFilter =", notificationTypeFilter);
      const params = new URLSearchParams({
        // neha k
        CustId: String(auth.custId),
        sEcho: String(requestModel.sEcho),
        iDisplayStart: String(requestModel.iDisplayStart),
        iDisplayLength: String(requestModel.iDisplayLength),
        sSearch: requestModel.sSearch || "",
        sortColumn: requestModel.sortColumn || "",
        sortDirection: requestModel.sortDirection || "",
        typeid: String(typeId),
        messagetype: messageTypeFilter,
        //beginDate: date?.from ? date.from.toLocaleString("en-US").replace(",", "") : "",
        //endDate: date?.to ? date.to.toLocaleString("en-US").replace(",", "") : "",
        //beginDate:format(startOfDay(date?.from ||new Date()),"M/d/yyyy h:mm:ss a"),
        beginDate: date?.from? format(date.from, "M/d/yyyy h:mm:ss a"): "",
        endDate: date?.to? format(date.to, "M/d/yyyy h:mm:ss a"): date?.from? format(date.from, "M/d/yyyy h:mm:ss a"): "",
        vehicleNo: selectedVehicle // neha k extra parameter added
      });

      const response = await fetch(
        `${API_BASE_URL}/Reports/GetMessageReports?${params.toString()}`
      );
      const text = await response.text();
      if (!text) {
        setReportData([]);
        return;
      }
      const result = JSON.parse(text);
      console.log(result);
      console.log(result?.aaData);  // neha k 
      const formattedData = (result?.aaData || []).map(
        //console.log(formattedData);
        (item: any, index: number) => ({
          id: index + 1,
          vehicleId: String(item.vehicleId || ""),
          vehicleName:
            item.vehicleName ||
            item.vehName ||
            "-",
          messageDate:
            item.messageDate ||
            "-",
          messageType:
            item.messageType ||
            item.type ||
            "-",
          mobile:
            item.mobile ||
            item.mobileNo ||
            "-",
          message:
            item.messageText ||
            "-",

          androidStatus:
            item.androidstatus ||
            "NA",

          iosStatus:
            item.iosstatus ||
            "NA",

          notificationType:
            item.notificationType ||
            "-",
        })
      );

      setReportData(formattedData);
      setTotalRecords(result?.iTotalRecords || 0);
    } catch (error) {
      console.error("GetMessageReports API Error:", error);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: ReportDataKey) => {
    const direction =
      sortConfig.key === key &&
        sortConfig.direction === "asc"
        ? "desc"
        : "asc";
    setSortConfig({
      key,
      direction,
    });

    setPage(0);
  };

  
  // reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [
    selectedVehicle,
    messageTypeFilter,
    notificationTypeFilter,
    date,
    search,
  ]);

  // fetch report data
  useEffect(() => {
    if (!custId) return;

    getMessageReports();
  }, [
    page,
    rowsPerPage,
    search,
    selectedVehicle,
    messageTypeFilter,
    notificationTypeFilter,
    sortConfig,
    date,
  ]);


  useEffect(() => {
    fetch(`${API_BASE_URL}/Reports/GetMessageType`)
      .then(async (res) => {
        const text = await res.text();
        if (!text) {
          console.warn("Empty response");
          return [];
        }
        return JSON.parse(text);
      })
      .then(data => {
        const messageTypes = data?.data || data || [];
        const formatted = [
          { label: 'All Message Types', value: '0' },

          ...messageTypes.map((item: any) => ({
            label: item.name,
            value: String(item.value)
          }))
        ];
        setMessageTypeList(formatted);
      })
      .catch(err => console.error("Message Type API error:", err));

  }, []);

  const paginatedData = reportData;
  const totalPages = Math.ceil(totalRecords / rowsPerPage);

  const auth = JSON.parse(
    localStorage.getItem("trackmaster-auth") || "{}"
  );

  const typeId =
    notificationTypeFilter === "0"
      ? 0
      : Number(notificationTypeFilter);

  const requestModel = {
    CustId: auth.custId,
    sEcho: 1,
    sSearch: search?.trim() || "",
    sortColumn: sortMap[sortConfig.key] || "",
    sortDirection: sortConfig.direction || "",
  };

  const extraParams = {
    typeid: String(typeId),
    messagetype: messageTypeFilter,
    //beginDate: date?.from? date.from.toLocaleString("en-US").replace(",", ""): "",
    //endDate: date?.to? date.to.toLocaleString("en-US").replace(",", ""): "",
    //beginDate:format(startOfDay(date?.from ||new Date()),"M/d/yyyy h:mm:ss a"),
    beginDate: date?.from? format(date.from, "M/d/yyyy h:mm:ss a"): "",
    endDate: date?.to? format(date.to, "M/d/yyyy h:mm:ss a"): date?.from? format(date.from, "M/d/yyyy h:mm:ss a"): "",
    vehicleNo: selectedVehicle,
  };

  const {
  exportExcel,
  exportPdf,
} = useReportDownload(
  "/Reports/GetMessageReports",
  requestModel,
  extraParams
);

// PUT HERE 👇

const handleExportExcel = async () => {
  setLoading(true);
  try {
    await exportExcel();
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};

const handleExportPdf = async () => {
  setLoading(true);
  try {
    await exportPdf();
  } catch (error) {
    console.error(error);
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
            <CardTitle className="text-xl font-bold text-foreground">SMS & Notification Report</CardTitle>
            <CardDescription>Detailed log of all outgoing communications.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            <DateRangePicker date={date} setDate={setDate} />
            <VehicleCombobox vehicles={vehicleList} value={selectedVehicle} onChange={setSelectedVehicle} className="w-full sm:w-[180px]" />
            <Popover
              open={messageTypeOpen}
              onOpenChange={setMessageTypeOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full sm:w-[220px] justify-between"
                >
                  {messageTypeFilter === "0"
                    ? "All Message Types"
                    : messageTypeList.find(
                      (item) => item.value === messageTypeFilter
                    )?.label}

                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-[220px]"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search message type..." />

                  <CommandGroup className="max-h-64 overflow-y-auto">
                    {messageTypeList.map((item) => (
                      <CommandItem
                        key={item.value}
                        value={item.label}
                        onSelect={() => {
                          setMessageTypeFilter(item.value);
                          setMessageTypeOpen(false);
                        }}
                      >
                        <Check className={`mr-2 h-4 w-4 ${messageTypeFilter === item.value
                          ? "opacity-100"
                          : "opacity-0"
                          }`}
                        />
                        {item.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <Select
              value={notificationTypeFilter}
              onValueChange={(value) => {
                console.log("Selected Notification Type:", value);

                setNotificationTypeFilter(String(value));
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* <SelectItem value="0">All Notification Types</SelectItem> neha k */}
                {notificationTypes.map((type) => (
                  <SelectItem
                    key={String(type.id)}
                    value={String(type.id)}
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* <DropdownMenuItem onClick={exportPdf}><FileText className="mr-2 h-4 w-4" />Export as PDF</DropdownMenuItem>            
                <DropdownMenuItem onClick={exportExcel}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export as Excel</DropdownMenuItem> */}
                <DropdownMenuItem onClick={handleExportPdf}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleExportExcel}>
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
                    <SortableHeader key={header.key} onClick={() => handleSort(header.key)}>
                      {header.label}
                    </SortableHeader>
                  ))}
                  {/* <TableHead className="px-6 py-3 text-center">Action</TableHead> */}
                </TableRow>
              </TableHeader>


              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10"
                    >
                      Please wait...
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((row) => (
                    <TableRow key={row.id} className="bg-card hover:bg-muted/50 border-b">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                        {row.vehicleName}
                      </TableCell>

                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {row.messageDate}
                      </TableCell>

                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {row.messageType}
                      </TableCell>

                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {row.mobile}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground max-w-[350px] whitespace-normal break-words">
                        {row.message}
                      </TableCell>

                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
                        <StatusBadge status={row.androidStatus} />
                      </TableCell>

                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
                        <StatusBadge status={row.iosStatus} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
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
              <SelectTrigger className="w-20 h-9 text-sm"><SelectValue placeholder={rowsPerPage} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {totalRecords === 0
                ? "0-0"
                : `${page * rowsPerPage + 1}-${Math.min(
                  (page + 1) * rowsPerPage,
                  totalRecords
                )}`}{" "}
              of {totalRecords}
            </div>
            <div className="flex items-center gap-2">

              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="disabled:opacity-40"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              <button
                onClick={() => setPage(p => Math.max(p - 1, 0))}
                disabled={page === 0}
                className="disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                onClick={() =>
                  setPage(p => Math.min(p + 1, totalPages - 1))
                }
                disabled={page >= totalPages - 1}
                className="disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                className="disabled:opacity-40"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </>
  );
};

export default SmsNotificationReportTable;