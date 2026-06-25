import React, { useState, useMemo } from 'react';
import { API_BASE_URL } from "@/config/Api";
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
import { Button } from '@/components/ui/button';
import type { Poi } from '@/data/poiData';
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Trash2,
  Search,
  ChevronsUpDown,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import EditPoiDialog from './EditPoiDialog';

type PoiDataKey = keyof Poi;

const headers: { key: PoiDataKey; label: string }[] = [
  { key: 'poiName', label: 'POI Name' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
  { key: 'radius', label: 'Radius (meter)' },
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

interface ManagePoiTableProps {
  pois: Poi[];
  totalCount: number;
  page: number;
  rowsPerPage: number;

  onPageChange: (page: number) => void;
  onRowsPerPageChange: (size: number) => void;
  onSearch: (search: string) => void;

  onUpdatePois: (pois: Poi[]) => void;
} 

const ManagePoiTable = ({
  pois,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onSearch,
  onUpdatePois,
}: ManagePoiTableProps) => {
  
  const [sortConfig, setSortConfig] = useState<{
    key: PoiDataKey;
    direction: 'asc' | 'desc';
  }>({ key: 'poiName', direction: 'asc' });
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);

  const filteredAndSortedData = pois;

  const handleSort = (key: PoiDataKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    onPageChange(0);
  };

  const handleSearchChange = (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const value = event.target.value;

  setSearchTerm(value);

  onSearch(value);
};

 const paginatedData = pois;

  const totalPages =
  Math.ceil(totalCount / rowsPerPage);
  const firstRowIndex = page * rowsPerPage + 1;
  const lastRowIndex = Math.min(
  (page + 1) * rowsPerPage,
  totalCount
);

  const handleEdit = (poi: Poi) => {
    setSelectedPoi(poi);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = (updatedPoi: Poi) => {
    onUpdatePois(pois.map(p => p.id === updatedPoi.id ? updatedPoi : p));
  };

 const handleDelete = async (poi: Poi) => {
  try {
    const response = await fetch(
    `${API_BASE_URL}/Geofence/EditPoi?id=${poi.id}&action=DELETE`,
    {
      method: "POST",
    }
   );

    const result = await response.json();

    if (result.success) {
      onUpdatePois(pois.filter(p => p.id !== poi.id));

      toast({
        title: "POI Deleted",
        description: result.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Error",
        description: result.message || "Delete failed",
        variant: "destructive",
      });
    }
  } catch (error) {
    toast({
      title: "Error",
      description: "Server error while deleting POI",
      variant: "destructive",
    });
  }
};

  return (
    <>
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">
              Manage Points of Interest
            </CardTitle>
            <CardDescription>
              View, edit, or delete existing POIs for your maps.
            </CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search POIs..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
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
                      onClick={() => handleSort(header.key)}
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
                  <TableHead className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row) => (
                  <TableRow
                    key={row.id}
                    className="bg-card hover:bg-muted/50 border-b"
                  >
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                      {row.poiName}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-mono">
                      {Number(row.latitude).toFixed(4)}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-mono">
                      {Number(row.longitude).toFixed(4)}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {row.radius}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(row)}>
                          <Pencil className="h-4 w-4 text-blue-500" />
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
                                This action cannot be undone. This will permanently delete the POI "{row.poiName}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(row)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
              onRowsPerPageChange(Number(value));
              onPageChange(0);
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
              {firstRowIndex}-{lastRowIndex} of {totalCount}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => onPageChange(0)}
                disabled={page === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => onPageChange(totalPages - 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
      <EditPoiDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        poi={selectedPoi}
        onSave={handleSaveEdit}
      />
    </>
  );
};

export default ManagePoiTable;