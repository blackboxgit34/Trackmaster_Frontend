import { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  sampleTripViolations,
  TripViolation,
  ViolationType,
  ViolationSeverity,
  ViolationStatus,
  violationTypeLabels
} from '@/data/tripViolationData';
import { useSettings } from '@/context/SettingsContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import WhatsappPopup from '@/components/WhatsappPopup';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  NavigationOff,
  MapPinOff,
  OctagonAlert,
  Hourglass,
  Ban,
  Zap,
  ClockAlert,
  Moon,
  Search,
  Download,
  Eye,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  FileSpreadsheet,
  FileText,
  User,
  Truck,
  Phone,
  Calendar,
  MapPin,
  Check,
  Clock,
  TrendingUp,
} from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '380px',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: 19.0760,
  lng: 72.8777,
};

export default function TripViolationsPage() {
  const { uiSettings } = useSettings();
  const showDriverName = uiSettings?.showDriverName ?? true;
  const [violations, setViolations] = useState<TripViolation[]>(sampleTripViolations);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewingViolation, setViewingViolation] = useState<TripViolation | null>(null);
  const { toast } = useToast();

  // Helper icon retriever
  const getViolationIcon = (type: ViolationType) => {
    switch (type) {
      case 'route_deviation': return <NavigationOff className="w-4 h-4 text-red-500" />;
      case 'missed_waypoint': return <MapPinOff className="w-4 h-4 text-orange-500" />;
      case 'missed_halt': return <OctagonAlert className="w-4 h-4 text-amber-500" />;
      case 'halt_exceeded': return <Hourglass className="w-4 h-4 text-purple-500" />;
      case 'unauthorized_stop': return <Ban className="w-4 h-4 text-red-600" />;
      case 'overspeeding': return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'schedule_delay': return <ClockAlert className="w-4 h-4 text-blue-500" />;
      case 'curfew_violation': return <Moon className="w-4 h-4 text-indigo-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: ViolationSeverity) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-600 hover:bg-red-700 text-white font-medium">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-medium">High</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-medium">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: ViolationStatus) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> Open</Badge>;
      case 'investigating':
        return <Badge className="bg-amber-500 text-white flex items-center gap-1"><Clock className="w-3 h-3" /> Investigating</Badge>;
      case 'acknowledged':
        return <Badge className="bg-blue-600 text-white flex items-center gap-1"><Check className="w-3 h-3" /> Acknowledged</Badge>;
      case 'resolved':
        return <Badge className="bg-emerald-600 text-white flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Resolved</Badge>;
    }
  };

  // KPI calculations
  const kpis = useMemo(() => {
    const total = violations.length;
    const routeDeviations = violations.filter(v => v.violationType === 'route_deviation').length;
    const missedCheckpoints = violations.filter(v => v.violationType === 'missed_waypoint' || v.violationType === 'missed_halt').length;
    const haltExceeded = violations.filter(v => v.violationType === 'halt_exceeded' || v.violationType === 'unauthorized_stop').length;
    const criticalHigh = violations.filter(v => v.severity === 'critical' || v.severity === 'high').length;

    return { total, routeDeviations, missedCheckpoints, haltExceeded, criticalHigh };
  }, [violations]);

  // Filtered dataset
  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      const matchesSearch =
        v.tripId.toLowerCase().includes(search.toLowerCase()) ||
        v.vehicleNo.toLowerCase().includes(search.toLowerCase()) ||
        v.driverName.toLowerCase().includes(search.toLowerCase()) ||
        v.routeName.toLowerCase().includes(search.toLowerCase()) ||
        v.location.toLowerCase().includes(search.toLowerCase()) ||
        v.title.toLowerCase().includes(search.toLowerCase());

      const matchesType = selectedType === 'all' || v.violationType === selectedType;
      const matchesSeverity = selectedSeverity === 'all' || v.severity === selectedSeverity;
      const matchesStatus = selectedStatus === 'all' || v.status === selectedStatus;

      return matchesSearch && matchesType && matchesSeverity && matchesStatus;
    });
  }, [violations, search, selectedType, selectedSeverity, selectedStatus]);

  // Status handler
  const handleUpdateStatus = (id: string, newStatus: ViolationStatus) => {
    setViolations(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
    if (viewingViolation && viewingViolation.id === id) {
      setViewingViolation(prev => prev ? { ...prev, status: newStatus } : null);
    }
    toast({
      title: 'Status Updated',
      description: `Violation ${id} marked as ${newStatus}.`,
    });
  };

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = [
      'Violation ID',
      'Trip ID',
      'Vehicle No',
      'Driver Name',
      'Route Name',
      'Violation Type',
      'Title',
      'Details',
      'Location',
      'Severity',
      'Status',
      'Timestamp',
    ];

    const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

    const rows = filteredViolations.map(v => [
      v.id,
      v.tripId,
      v.vehicleNo,
      escapeCsv(v.driverName),
      escapeCsv(v.routeName),
      escapeCsv(violationTypeLabels[v.violationType]?.label || v.violationType),
      escapeCsv(v.title),
      escapeCsv(v.details),
      escapeCsv(v.location),
      v.severity,
      v.status,
      v.timestamp,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Trip_Violations_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Report Downloaded',
      description: `Exported ${filteredViolations.length} records to CSV file.`,
    });
  };

  // Export PDF handler
  const handleExportPDF = () => {
    if (filteredViolations.length === 0) {
      toast({
        title: 'No Data to Export',
        description: 'There are no violation records matching your current filter criteria.',
        variant: 'destructive',
      });
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });

    // Header Title & Subtitle
    doc.setFontSize(16);
    doc.setTextColor(220, 38, 38);
    doc.text("Trackmaster Telematics System", 14, 15);
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    doc.text("Trip Violations & Non-Compliance Audit Report", 14, 22);

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Generated: ${new Date().toLocaleString()} | Filtered Incidents: ${filteredViolations.length}`, 14, 28);

    const tableColumn = [
      'Violation ID',
      'Trip ID',
      'Vehicle No',
      'Driver Name',
      'Violation Type',
      'Details',
      'Location',
      'Severity',
      'Status',
      'Timestamp',
    ];

    const tableRows = filteredViolations.map(v => [
      v.id,
      v.tripId,
      v.vehicleNo,
      v.driverName,
      violationTypeLabels[v.violationType]?.label || v.violationType,
      v.details,
      v.location,
      v.severity.toUpperCase(),
      v.status.toUpperCase(),
      v.timestamp,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      headStyles: {
        fillColor: [185, 28, 28],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    });

    const dateTag = new Date().toISOString().split('T')[0];
    doc.save(`trip-violations-report-${dateTag}.pdf`);

    toast({
      title: 'PDF Report Downloaded',
      description: `Successfully exported ${filteredViolations.length} violation records to PDF.`,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Report Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Trip Violations & Non-Compliance Report
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor, audit, and generate reports on route deviations, missed waypoints/halts, overstays, speed breaches, and curfew violations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleExportPDF}>
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <WhatsappPopup />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
              Total Violations
              <ShieldAlert className="w-4 h-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{kpis.total}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-red-500" /> Recorded across active trips
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
              Route Deviations
              <NavigationOff className="w-4 h-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{kpis.routeDeviations}</div>
            <p className="text-xs text-muted-foreground mt-1">Off-corridor drift events</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
              Missed Halts & Waypoints
              <MapPinOff className="w-4 h-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{kpis.missedCheckpoints}</div>
            <p className="text-xs text-muted-foreground mt-1">Skipped mandatory checkpoints</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
              Halt Limit Overruns
              <Hourglass className="w-4 h-4 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{kpis.haltExceeded}</div>
            <p className="text-xs text-muted-foreground mt-1">Exceeded stop time limit</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-600 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
              Critical / High Severity
              <AlertOctagon className="w-4 h-4 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-red-600">{kpis.criticalHigh}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate review</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div>
              <CardTitle className="text-lg">Trip Violations Register</CardTitle>
              <CardDescription>Filter and audit individual vehicle and driver non-compliance incidents.</CardDescription>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 w-full xl:w-auto">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={showDriverName ? "Search vehicle, driver, trip..." : "Search vehicle, trip..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-sm h-9"
                />
              </div>

              {/* Violation Type */}
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Violation Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Violation Types</SelectItem>
                  <SelectItem value="route_deviation">Route Deviation</SelectItem>
                  <SelectItem value="missed_waypoint">Missed Waypoint</SelectItem>
                  <SelectItem value="missed_halt">Missed Halt</SelectItem>
                  <SelectItem value="halt_exceeded">Halt Limit Exceeded</SelectItem>
                  <SelectItem value="unauthorized_stop">Unauthorized Stop</SelectItem>
                  <SelectItem value="overspeeding">Overspeeding</SelectItem>
                  <SelectItem value="schedule_delay">Schedule Delay</SelectItem>
                  <SelectItem value="curfew_violation">Curfew / Night Driving</SelectItem>
                </SelectContent>
              </Select>

              {/* Severity */}
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Status */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Violation & Trip ID</TableHead>
                  <TableHead className="font-semibold">{showDriverName ? 'Vehicle & Driver' : 'Vehicle'}</TableHead>
                  <TableHead className="font-semibold">Violation Type</TableHead>
                  <TableHead className="font-semibold">Parameter Details</TableHead>
                  <TableHead className="font-semibold">Location / Geofence</TableHead>
                  <TableHead className="font-semibold">Timestamp</TableHead>
                  <TableHead className="font-semibold">Severity</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredViolations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No trip violations found matching your search and filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredViolations.map((v) => (
                    <TableRow key={v.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{v.id}</span>
                          <span className="text-xs text-muted-foreground">{v.tripId}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                            {v.vehicleNo}
                          </span>
                          {showDriverName && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" /> {v.driverName}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getViolationIcon(v.violationType)}
                          <span className="text-sm font-medium">
                            {violationTypeLabels[v.violationType]?.label || v.violationType}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="max-w-[280px]">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground truncate">{v.title}</span>
                          <span className="text-xs text-muted-foreground truncate">{v.details}</span>
                        </div>
                      </TableCell>

                      <TableCell className="max-w-[180px]">
                        <span className="text-xs text-muted-foreground flex items-center gap-1 truncate" title={v.location}>
                          <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                          {v.location}
                        </span>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {v.timestamp}
                        </span>
                      </TableCell>

                      <TableCell>{getSeverityBadge(v.severity)}</TableCell>

                      <TableCell>{getStatusBadge(v.status)}</TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => setViewingViolation(v)}
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          Map & Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Violation Map & Inspector Modal */}
      {viewingViolation && (
        <Dialog open={!!viewingViolation} onOpenChange={() => setViewingViolation(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-start pr-6">
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    {getViolationIcon(viewingViolation.violationType)}
                    Violation Inspector: {viewingViolation.id} ({viewingViolation.title})
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    Trip {viewingViolation.tripId} &bull; Route: {viewingViolation.routeName}
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getSeverityBadge(viewingViolation.severity)}
                  {getStatusBadge(viewingViolation.status)}
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Information Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="bg-muted/30">
                  <CardContent className="p-3 text-xs space-y-1.5">
                    <div className="font-semibold text-muted-foreground uppercase tracking-wider">Vehicle Details</div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-primary" /> {viewingViolation.vehicleNo}
                    </div>
                    <div className="text-muted-foreground">ID: {viewingViolation.vehicleId}</div>
                  </CardContent>
                </Card>

                {showDriverName && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-3 text-xs space-y-1.5">
                      <div className="font-semibold text-muted-foreground uppercase tracking-wider">Driver Contact</div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <User className="w-4 h-4 text-primary" /> {viewingViolation.driverName}
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" /> {viewingViolation.driverPhone}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-muted/30">
                  <CardContent className="p-3 text-xs space-y-1.5">
                    <div className="font-semibold text-muted-foreground uppercase tracking-wider">Incident Context</div>
                    <div className="font-bold text-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> {viewingViolation.timestamp}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1 truncate" title={viewingViolation.location}>
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" /> {viewingViolation.location}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Breakdown Box */}
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm space-y-1">
                <div className="font-bold text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Violation Parameter Failure Details
                </div>
                <p className="text-foreground text-xs">{viewingViolation.details}</p>
                {viewingViolation.speedLimit && viewingViolation.maxRecordedSpeed && (
                  <p className="text-xs font-semibold text-red-600 mt-1">
                    Speed Limit: {viewingViolation.speedLimit} km/h | Peak Speed Recorded: {viewingViolation.maxRecordedSpeed} km/h
                  </p>
                )}
                {viewingViolation.deviationDistanceKm && (
                  <p className="text-xs font-semibold text-amber-600 mt-1">
                    Max Deviation Distance Off-Corridor: {viewingViolation.deviationDistanceKm} km
                  </p>
                )}
              </div>

              {/* Map View */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Interactive Route & Violation Map</span>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-1 bg-blue-500 inline-block rounded-full"></span> Assigned Route
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-1 bg-red-500 inline-block rounded-full"></span> Vehicle Path / Deviation
                    </span>
                  </div>
                </div>

                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  zoom={12}
                  center={viewingViolation.coords || defaultCenter}
                >
                  {/* Assigned polyline */}
                  {viewingViolation.assignedRoutePath && (
                    <Polyline
                      path={viewingViolation.assignedRoutePath}
                      options={{ strokeColor: '#3b82f6', strokeOpacity: 0.8, strokeWeight: 4 }}
                    />
                  )}

                  {/* Actual path */}
                  {viewingViolation.actualRoutePath && (
                    <Polyline
                      path={viewingViolation.actualRoutePath}
                      options={{ strokeColor: '#ef4444', strokeOpacity: 0.9, strokeWeight: 4 }}
                    />
                  )}

                  {/* Main incident marker */}
                  <Marker
                    position={viewingViolation.coords}
                    title={viewingViolation.title}
                  />

                  {/* Waypoints markers */}
                  {viewingViolation.waypoints?.map((wp) => (
                    <Marker
                      key={wp.id}
                      position={{ lat: wp.lat, lng: wp.lng }}
                      title={`${wp.name} (${wp.status.toUpperCase()})`}
                    />
                  ))}
                </GoogleMap>
              </div>

              {/* Waypoints & Halts Audit Section */}
              {(viewingViolation.waypoints || viewingViolation.halts) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {viewingViolation.waypoints && (
                    <Card>
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Waypoints Audit Trail
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-1 space-y-2">
                        {viewingViolation.waypoints.map(wp => (
                          <div key={wp.id} className="flex justify-between items-center text-xs p-2 rounded bg-muted/40">
                            <div>
                              <div className="font-semibold text-foreground">{wp.name}</div>
                              <div className="text-muted-foreground">Expected: {wp.expectedTime}</div>
                            </div>
                            {wp.status === 'passed' ? (
                              <Badge className="bg-emerald-600 text-white">Passed ({wp.actualTime})</Badge>
                            ) : (
                              <Badge variant="destructive">Missed</Badge>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {viewingViolation.halts && (
                    <Card>
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Halts & Stoppages Audit
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-1 space-y-2">
                        {viewingViolation.halts.map(hlt => (
                          <div key={hlt.id} className="flex justify-between items-center text-xs p-2 rounded bg-muted/40">
                            <div>
                              <div className="font-semibold text-foreground">{hlt.name}</div>
                              <div className="text-muted-foreground">Limit: {hlt.allowedDurationMin}m | Actual: {hlt.actualDurationMin}m</div>
                            </div>
                            {hlt.status === 'normal' && <Badge className="bg-emerald-600 text-white">Normal</Badge>}
                            {hlt.status === 'exceeded' && <Badge className="bg-purple-600 text-white">Limit Exceeded</Badge>}
                            {hlt.status === 'unauthorized' && <Badge variant="destructive">Unauthorized</Badge>}
                            {hlt.status === 'missed' && <Badge className="bg-amber-600 text-white">Skipped</Badge>}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 border-t pt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">Quick Status Change:</span>
                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(viewingViolation.id, 'investigating')}>
                  Investigating
                </Button>
                <Button size="sm" variant="outline" className="text-blue-600 border-blue-200" onClick={() => handleUpdateStatus(viewingViolation.id, 'acknowledged')}>
                  Acknowledge
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleUpdateStatus(viewingViolation.id, 'resolved')}>
                  Resolve
                </Button>
              </div>

              <Button variant="ghost" onClick={() => setViewingViolation(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
