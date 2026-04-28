import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { consolidatedReportTableData, vehicles } from '@/data/mockData';
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
  ListFilter,
  Settings2,
  PlusCircle,
  CalendarIcon,
  MoreHorizontal,
  ChevronsUpDown,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subWeeks, isWithinInterval, parseISO, startOfDay, endOfDay, format, subDays, subMonths } from 'date-fns';
import WhatsappPopup from '../WhatsappPopup';
import { VehicleCombobox } from '../VehicleCombobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SaveTemplateDialog from './SaveTemplateDialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import EditTemplateDialog from './EditTemplateDialog';
import NotFound from './NotFound';

export const ALL_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'machineId', label: 'Machine ID' },
  { key: 'machineName', label: 'Machine Name' },
  { key: 'location', label: 'Location' },
  { key: 'workingHours', label: 'Working Hours (Hrs)' },
  { key: 'distance', label: 'Distance (km)' },
  { key: 'fuelConsumed', label: 'Fuel Consumed (L)' },
  { key: 'cumulativeHours', label: 'Cumulative Hours' },
  { key: 'nextServiceAt', label: 'Next Service At (Hrs)' },
  { key: 'serviceStatus', label: 'Service Status' },
  { key: 'alertsCount', label: 'Alerts Count' },
  { key: 'errorCount', label: 'Error Count' },
];

type ReportData = (typeof consolidatedReportTableData)[0] & { distance?: number };
type ReportDataKey = keyof ReportData;

export interface ReportTemplate {
  id: string;
  name: string;
  columns: Set<string>;
  vehicle: string;
  dateRange?: DateRange;
}

const SortableHeader = ({ children, isSorted, sortDirection, onClick }: { children: React.ReactNode; isSorted?: boolean; sortDirection?: 'asc' | 'desc'; onClick: () => void; }) => (
  <TableHead
    className="cursor-pointer px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider group"
    onClick={onClick}
  >
    <div className="flex items-center gap-2">
      {children}
      {isSorted ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )
      ) : (
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
      )}
    </div>
  </TableHead>
);

const getStatusBadgeVariant = (status: string): 'destructive' | 'secondary' | 'default' => {
  switch (status.toLowerCase()) {
    case 'ok': return 'secondary';
    case 'due soon': return 'default';
    case 'overdue': return 'destructive';
    default: return 'secondary';
  }
};

const CustomReport = () => {
  const { subpage } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(['date', 'machineName', 'workingHours', 'distance', 'fuelConsumed']));
  const [tempSelectedColumns, setTempSelectedColumns] = useState<Set<string>>(selectedColumns);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>({ from: subWeeks(new Date(), 1), to: new Date() });
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: ReportDataKey; direction: 'asc' | 'desc'; }>({ key: 'date', direction: 'desc' });
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [shouldGenerateReport, setShouldGenerateReport] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);

  const validSubpages = ['create', 'templates'];
  if (subpage && !validSubpages.includes(subpage)) {
    return <NotFound />;
  }
  const activeTab = subpage || 'create';

  const handleTabChange = (value: string) => {
    navigate(`/reports/custom-report/${value}`);
  };

  const handlePresetSelect = (preset: 'today' | 'yesterday' | '7d' | 'last-month' | 'last-2-months') => {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date = now;

    switch (preset) {
      case 'today': fromDate = now; break;
      case 'yesterday': fromDate = subDays(now, 1); toDate = subDays(now, 1); break;
      case '7d': fromDate = subWeeks(now, 1); break;
      case 'last-month': fromDate = subMonths(now, 1); break;
      case 'last-2-months': fromDate = subMonths(now, 2); break;
    }
    setDate({ from: fromDate, to: toDate });
    setIsCalendarOpen(false);
  };

  const handleGenerateReport = () => {
    let data = consolidatedReportTableData.map(d => ({ ...d, distance: d.distance || 0 }));

    if (date?.from) {
      const start = startOfDay(date.from);
      const end = date.to ? endOfDay(date.to) : endOfDay(date.from);
      data = data.filter(item => {
        const itemDate = parseISO(item.date);
        return isWithinInterval(itemDate, { start, end });
      });
    }

    if (selectedVehicle !== 'all') {
      data = data.filter(item => item.machineId === selectedVehicle);
    }
    setReportData(data);
    setPage(0);
  };

  useEffect(() => {
    if (shouldGenerateReport) {
      handleGenerateReport();
      setShouldGenerateReport(false);
    }
  }, [shouldGenerateReport, date, selectedVehicle, selectedColumns]);

  const handleSaveTemplate = (name: string) => {
    const newTemplate: ReportTemplate = {
      id: `template-${Date.now()}`,
      name,
      columns: new Set(selectedColumns),
      vehicle: selectedVehicle,
      dateRange: date,
    };
    setTemplates(prev => [...prev, newTemplate]);
    toast({ title: "Template Saved", description: `"${name}" has been saved.` });
    setIsSaveDialogOpen(false);
  };

  const applyTemplateSettings = (template: ReportTemplate) => {
    setSelectedColumns(template.columns);
    setSelectedVehicle(template.vehicle);
    setDate(template.dateRange);
    setShouldGenerateReport(true);
  };

  const handleApplyTemplateAndNavigate = (template: ReportTemplate) => {
    applyTemplateSettings(template);
    navigate('/reports/custom-report/create');
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    toast({ title: "Template Deleted", variant: "destructive" });
  };

  const handleEditTemplate = (template: ReportTemplate) => {
    setEditingTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedTemplate = (updatedTemplate: ReportTemplate) => {
    setTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
    toast({ title: "Template Updated", description: `"${updatedTemplate.name}" has been updated.` });
  };

  const sortedData = useMemo(() => {
    const sortableData = [...reportData];
    if (sortConfig) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof typeof a];
        const bValue = b[sortConfig.key as keyof typeof b];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableData;
  }, [reportData, sortConfig]);

  const handleSort = (key: ReportDataKey) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    setPage(0);
  };

  const generateExportData = (dataToExport: ReportData[]) => {
    return dataToExport.map(row => {
      const newRow: { [key: string]: any } = {};
      selectedColumns.forEach(key => {
        const col = ALL_COLUMNS.find(c => c.key === key);
        if (col) {
          newRow[col.label] = row[key as ReportDataKey];
        }
      });
      return newRow;
    });
  };

  const handleExportPDF = () => {
    const exportData = generateExportData(sortedData);
    if (exportData.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const tableColumn = Object.keys(exportData[0]);
    const tableRows = exportData.map(row => Object.values(row).map(String));
    doc.text("Custom Report", 14, 15);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    doc.save(`custom-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportCSV = () => {
    const exportData = generateExportData(sortedData);
    if (exportData.length === 0) return;
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `custom-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="px-6 bg-card border-b">
          <div className="flex items-baseline gap-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">
              Custom Report
            </h1>
            <TabsList>
              <TabsTrigger value="create">Create Report</TabsTrigger>
              <TabsTrigger value="templates">My Templates</TabsTrigger>
            </TabsList>
          </div>
        </div>
        <div className="p-6">
          <TabsContent value="create">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Custom Report Generator</CardTitle>
                    <CardDescription>Select your parameters and generate a custom report.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <VehicleCombobox vehicles={vehicles} value={selectedVehicle} onChange={setSelectedVehicle} className="w-full sm:w-[180px]" />
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant={'outline'}
                          className={cn(
                            'w-full sm:w-[260px] justify-start text-left font-normal',
                            !date && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date?.from ? (
                            date.to ? (
                              <>
                                {format(date.from, 'LLL dd, y')} -{' '}
                                {format(date.to, 'LLL dd, y')}
                              </>
                            ) : (
                              format(date.from, 'LLL dd, y')
                            )
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 flex" align="end">
                        <div className="flex flex-col space-y-1 p-2 border-r">
                          <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('today')}>Today</Button>
                          <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('yesterday')}>Yesterday</Button>
                          <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('7d')}>Last 7 Days</Button>
                          <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('last-month')}>Last Month</Button>
                          <Button variant="ghost" className="justify-start" onClick={() => handlePresetSelect('last-2-months')}>Last 2 Months</Button>
                        </div>
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={date?.from}
                          selected={date}
                          onSelect={setDate}
                          numberOfMonths={1}
                        />
                      </PopoverContent>
                    </Popover>
                    <DropdownMenu open={isColumnSelectorOpen} onOpenChange={(open) => {
                      if (open) {
                        setTempSelectedColumns(new Set(selectedColumns));
                      }
                      setIsColumnSelectorOpen(open);
                    }}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                          <Settings2 className="mr-2 h-4 w-4" />
                          Select Columns ({selectedColumns.size})
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Report Parameters</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {ALL_COLUMNS.map(col => (
                          <DropdownMenuCheckboxItem
                            key={col.key}
                            checked={tempSelectedColumns.has(col.key)}
                            onCheckedChange={(checked) => {
                              setTempSelectedColumns(prev => {
                                const newSet = new Set(prev);
                                if (checked) newSet.add(col.key);
                                else newSet.delete(col.key);
                                return newSet;
                              });
                            }}
                            onSelect={(e) => e.preventDefault()}
                          >
                            {col.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <div className="p-2 flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setIsColumnSelectorOpen(false)}>Cancel</Button>
                          <Button size="sm" onClick={() => {
                            setSelectedColumns(tempSelectedColumns);
                            setIsColumnSelectorOpen(false);
                          }}>Apply</Button>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={handleGenerateReport} className="w-full sm:w-auto">
                      <ListFilter className="mr-2 h-4 w-4" />
                      Generate Report
                    </Button>
                    <Button variant="outline" onClick={() => setIsSaveDialogOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Save as Template
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {reportData.length > 0 && (
                <Card className="shadow-sm overflow-hidden">
                  <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4">
                    <div>
                      <CardTitle>Report Results</CardTitle>
                      <CardDescription>Found {reportData.length} records matching your criteria.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="bg-black text-white hover:bg-black/90 w-full sm:w-auto">
                            <Download className="mr-2 h-4 w-4" /> Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={handleExportPDF}><FileText className="mr-2 h-4 w-4" />Export as PDF</DropdownMenuItem>
                          <DropdownMenuItem onSelect={handleExportCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />Export as Excel</DropdownMenuItem>
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
                            {Array.from(selectedColumns).map(key => {
                              const column = ALL_COLUMNS.find(c => c.key === key);
                              return (
                                <SortableHeader key={key} onClick={() => handleSort(key as ReportDataKey)} isSorted={sortConfig.key === key} sortDirection={sortConfig.key === key ? sortConfig.direction : undefined}>
                                  {column?.label || key}
                                </SortableHeader>
                              );
                            })}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedData.map((row) => (
                            <TableRow key={row.id} className="bg-card hover:bg-muted/50 border-b">
                              {Array.from(selectedColumns).map(key => (
                                <TableCell key={key} className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                  {key === 'serviceStatus' ? (
                                    <Badge variant={getStatusBadgeVariant(row[key])}>{row[key]}</Badge>
                                  ) : (
                                    String(row[key as ReportDataKey] ?? '')
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
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
                      <span className="text-sm text-muted-foreground">{page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, sortedData.length)} of {sortedData.length}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(0)} disabled={page === 0}><ChevronsLeft className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(page - 1)} disabled={page === 0}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}><ChevronsRight className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              )}
            </div>
          </TabsContent>
          <TabsContent value="templates">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>My Report Templates</CardTitle>
                  <CardDescription>Manage your saved report templates.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed shadow-sm bg-card text-center p-8">
                    <h3 className="text-xl font-semibold">No Templates Yet</h3>
                    <p className="mt-2 text-muted-foreground max-w-md">
                      You haven't created any report templates. Go to the "Create Report" tab to save your first one.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template Name</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Columns</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map(template => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>{template.vehicle === 'all' ? 'All Vehicles' : template.vehicle}</TableCell>
                          <TableCell>{template.columns.size}</TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleApplyTemplateAndNavigate(template)}>
                                    View & Apply
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-red-500 focus:text-red-500"
                                    >
                                      Delete
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the "{template.name}" template.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
      <SaveTemplateDialog
        open={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        onSave={handleSaveTemplate}
      />
      <EditTemplateDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        template={editingTemplate}
        onSave={handleSaveEditedTemplate}
      />
    </>
  );
};

export default CustomReport;