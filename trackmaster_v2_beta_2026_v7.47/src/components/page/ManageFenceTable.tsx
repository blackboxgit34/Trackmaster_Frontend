import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { GeofenceShape } from '@/data/geofenceMapData';
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Trash2, Search, Pencil, ChevronsUpDown, } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import CopyFenceDialog from './CopyFenceDialog';
import EditFenceDialog from './EditFenceDialog';
import { Switch } from '../ui/switch';
import { API_BASE_URL } from '@/config/Api';

type GeofenceDataKey = keyof GeofenceShape;

const headers: { key: GeofenceDataKey; label: string }[] = [
  { key: 'name', label: 'Fence Name' },
  { key: 'type', label: 'Type' },
  { key: 'machines', label: 'Assigned Vehicles' },
  { key: 'isActive', label: 'Status' },
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

interface ManageFenceTableProps {
  fences?: GeofenceShape[];
  onUpdateFences?: (fences: GeofenceShape[]) => void;
}

// API Response Types
interface VehicleListItem {
  vehName: string;
  bbid: string;
  type: string;
}

interface GeofenceVehicleItem {
  vehName: string;
  bbid: string;
}

interface LatLongHistory {
  latitude: number;
  longitude: number;
}

interface GeofenceModel {
  fenceId: number;
  fenceName: string;
  radius: string;
  fenceType: string;
  isActive: boolean;
  vehicleLists: GeofenceVehicleItem[];
  latLongList: LatLongHistory[];
}

interface GetGeofenceListResponse {
  data: GeofenceModel[];
  count: number;
  vehicleList: VehicleListItem[];
}

const transformGeofenceData = (apiData: GeofenceModel): GeofenceShape => {
  return {
    id: apiData.fenceId,
    name: apiData.fenceName,
    type: (apiData.fenceType.toLowerCase() === 'circle' ? 'circle' : 'polygon') as 'circle' | 'polygon',
    machines: apiData.vehicleLists.map(v => v.bbid) || [],
    isActive: apiData.isActive,
    radius: apiData.fenceType.toLowerCase() === 'circle' ? parseInt(apiData.radius) || 0 : undefined,
    paths: apiData.fenceType.toLowerCase() === 'polygon' && apiData.latLongList.length > 0
      ? apiData.latLongList.map(coord => ({ lat: coord.latitude, lng: coord.longitude }))
      : undefined,
    center: apiData.fenceType.toLowerCase() === 'circle' && apiData.latLongList.length > 0
      ? { lat: apiData.latLongList[0].latitude, lng: apiData.latLongList[0].longitude }
      : undefined,
  };
};

// Map our local sort key to the column name the API expects.
// Adjust values to match what your backend accepts.
const SORT_COLUMN_MAP: Partial<Record<GeofenceDataKey, string>> = {
  name: 'fenceName',
  type: 'fenceType',
  machines: 'vehicleCount',
  isActive: 'isActive',
};

const DEBOUNCE_MS = 400;

const ManageFenceTable = ({ fences: propFences, onUpdateFences: propOnUpdateFences }: ManageFenceTableProps) => {
  // ── Server-driven state ──────────────────────────────────────────────────
  const [page, setPage] = useState(0);                       // 0-based page index
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: GeofenceDataKey; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // ── Data state ───────────────────────────────────────────────────────────
  const [fences, setFences] = useState<GeofenceShape[]>(propFences || []);
  const [totalCount, setTotalCount] = useState(0);            // total records on server
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<VehicleListItem[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>(['All Types']);

  // ── Dialog state ─────────────────────────────────────────────────────────
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedFence, setSelectedFence] = useState<GeofenceShape | null>(null);

  const { toast } = useToast();

  // ── Debounce search input ────────────────────────────────────────────────
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);                                             // reset to first page on new search
    }, DEBOUNCE_MS);
  };

  // ── Core fetch (all params sent to server) ───────────────────────────────
  const fetchGeofences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const custId = JSON.parse(localStorage.getItem('trackmaster-auth') ?? '{}')?.custId;
      if (!custId) {
        setError('Customer ID not found');
        return;
      }

      const sortColumn = SORT_COLUMN_MAP[sortConfig.key] ?? 'fenceName';

      const queryParams = new URLSearchParams({
        CustId: String(custId),
        iDisplayStart: String(page * rowsPerPage),           // offset
        iDisplayLength: String(rowsPerPage),                 // page size
        sSearch: debouncedSearch,                            // search term
        sSortColumn: sortColumn,                             // column to sort by
        sSortDir: sortConfig.direction,                      // 'asc' | 'desc'
      });

      const response = await fetch(`${API_BASE_URL}/Geofence/GetGeofenceList?${queryParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch geofences: ${response.statusText}`);
      }

      const result: GetGeofenceListResponse = await response.json();

      const geofenceList = result.data || [];
      const vehicleList = result.vehicleList || [];

      setAvailableVehicles(vehicleList);
      setTotalCount(result.count ?? 0);                      // total matching records

      setFences(geofenceList.map(transformGeofenceData));

      const types = [
        'All Types',
        ...Array.from(new Set(vehicleList.map(v => v.type).filter(Boolean))),
      ];
      setVehicleTypes(types);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch geofences';
      setError(errorMessage);
      console.error('Error fetching geofences:', err);
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, sortConfig, debouncedSearch, toast]);  // re-fetch whenever any param changes

  // Fetch on mount and whenever fetch dependencies change
  useEffect(() => {
    fetchGeofences();
  }, [fetchGeofences]);

  // Sync prop fences if parent provides them (overrides server data)
  useEffect(() => {
    if (propFences && propFences.length > 0) {
      setFences(propFences);
    }
  }, [propFences]);

  // ── Sorting ──────────────────────────────────────────────────────────────
  const handleSort = (key: GeofenceDataKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(0);
  };

  // ── Pagination helpers ───────────────────────────────────────────────────
  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const firstRowIndex = totalCount === 0 ? 0 : page * rowsPerPage + 1;
  const lastRowIndex = Math.min((page + 1) * rowsPerPage, totalCount);

  // ── Action handlers ──────────────────────────────────────────────────────
  const handleCopy = (fence: GeofenceShape) => { setSelectedFence(fence); setIsCopyDialogOpen(true); };
  const handleEdit = (fence: GeofenceShape) => { setSelectedFence(fence); setIsEditDialogOpen(true); };

  const handleSaveEdit = (updatedFence: GeofenceShape) => {
    // Optimistically update local slice, then re-sync with server
    setFences(prev => prev.map(f => f.id === updatedFence.id ? updatedFence : f));
    if (propOnUpdateFences) propOnUpdateFences(fences.map(f => f.id === updatedFence.id ? updatedFence : f));
    fetchGeofences();
  };

  const handleDelete = async (fenceId: number) => {
    try {
      setLoading(true);

      const fence = fences.find(f => f.id === fenceId);

      if (!fence) {
        throw new Error("Fence not found");
      }

      const response = await fetch(`${API_BASE_URL}/Geofence/DeleteGeofence?FenceId=${fenceId}&Type=${fence.type === "circle" ? "Circle" : "Polygon"}`);

      if (!response.ok) {
        throw new Error("Failed to delete geofence");
      }

      const result = await response.json();

      if (result === true || result.success === true) {
        toast({
          title: "Success",
          description: `${fence.name} deleted successfully.`,
        });

        fetchGeofences();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete geofence",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (fenceId: number) => {
    const updated = fences.map(f => f.id === fenceId ? { ...f, isActive: !f.isActive } : f);
    setFences(updated);
    if (propOnUpdateFences) propOnUpdateFences(updated);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {loading && (
        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-md">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow">
            <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
            <span className="text-sm">Please wait ...</span>
          </div>
        </div>
      )}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">Manage Geofences</CardTitle>
            <CardDescription>View, copy, or delete existing geofences for your vehicles.</CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search geofences..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-500 font-semibold">Error loading geofences</p>
                <p className="text-muted-foreground text-sm mt-1">{error}</p>
              </div>
            </div>
          )}
          {!error && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                    {headers.map((header) => (
                      <SortableHeader
                        key={header.key as string}
                        onClick={() => handleSort(header.key)}
                        isSorted={sortConfig.key === header.key}
                        sortDirection={sortConfig.key === header.key ? sortConfig.direction : undefined}
                      >
                        {header.label}
                      </SortableHeader>
                    ))}
                    <TableHead className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fences.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={headers.length + 1} className="text-center py-8 text-muted-foreground">
                        {loading ? 'Loading geofences...' : 'No geofences found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    fences.map((row) => (
                      <TableRow key={row.id} className="bg-card hover:bg-muted/50 border-b">
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                          {row.name}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground capitalize">
                          {row.type}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {row.machines.length} vehicle(s)
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          <Switch checked={row.isActive} onCheckedChange={() => handleToggleStatus(row.id)} />
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(row)}>
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCopy(row)}>
                              <Copy className="h-4 w-4 text-green-500" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the geofence "{row.name}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(row.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
          {!error && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select
                  value={String(rowsPerPage)}
                  onValueChange={(value) => { setRowsPerPage(Number(value)); setPage(0); }}
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
                  {totalCount === 0 ? '0' : `${firstRowIndex}-${lastRowIndex}`} of {totalCount}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(0)} disabled={page === 0}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardFooter>
      </Card>

      <CopyFenceDialog
        open={isCopyDialogOpen}
        onOpenChange={setIsCopyDialogOpen}
        fence={selectedFence}
        vehicles={availableVehicles}
        vehicleTypes={vehicleTypes}
        onSuccess={fetchGeofences}
        setParentLoading={setLoading}
      />
      <EditFenceDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        fence={selectedFence}
        vehicles={availableVehicles}
        vehicleTypes={vehicleTypes}
        onSave={handleSaveEdit}
        onSuccess={fetchGeofences}
        setParentLoading={setLoading}
      />
    </>
  );
};

export default ManageFenceTable;