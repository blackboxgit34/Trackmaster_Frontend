import React, { useState, useMemo } from 'react';
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
import type { GeofenceShape } from '@/data/geofenceMapData';
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Trash2,
  Search,
  Pencil,
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
import CopyFenceDialog from './CopyFenceDialog';
import EditFenceDialog from './EditFenceDialog';
import { Switch } from '../ui/switch';

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
  fences: GeofenceShape[];
  onUpdateFences: (fences: GeofenceShape[]) => void;
}

const ManageFenceTable = ({ fences, onUpdateFences }: ManageFenceTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: GeofenceDataKey;
    direction: 'asc' | 'desc';
  }>({ key: 'name', direction: 'asc' });
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedFence, setSelectedFence] = useState<GeofenceShape | null>(null);

  const filteredAndSortedData = useMemo(() => {
    const filteredData = fences.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    const sortableData = [...filteredData];
    if (sortConfig) {
      sortableData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (Array.isArray(aValue) && Array.isArray(bValue)) {
          return sortConfig.direction === 'asc' ? aValue.length - bValue.length : bValue.length - aValue.length;
        }
        if (aValue == null || bValue == null) return 0;
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
  }, [sortConfig, searchTerm, fences]);

  const handleSort = (key: GeofenceDataKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const paginatedData = filteredAndSortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);
  const firstRowIndex = page * rowsPerPage + 1;
  const lastRowIndex = Math.min(
    (page + 1) * rowsPerPage,
    filteredAndSortedData.length
  );

  const handleCopy = (fence: GeofenceShape) => {
    setSelectedFence(fence);
    setIsCopyDialogOpen(true);
  };

  const handleEdit = (fence: GeofenceShape) => {
    setSelectedFence(fence);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = (updatedFence: GeofenceShape) => {
    onUpdateFences(fences.map(f => f.id === updatedFence.id ? updatedFence : f));
    toast({
      variant: 'success',
      title: "Fence Updated",
      description: `Geofence "${updatedFence.name}" has been updated.`,
    });
  };

  const handleDelete = (fenceId: number) => {
    const fenceToDelete = fences.find(f => f.id === fenceId);
    onUpdateFences(fences.filter(f => f.id !== fenceId));
    toast({
      title: "Fence Deleted",
      description: `Geofence "${fenceToDelete?.name}" has been deleted.`,
      variant: "destructive",
    });
  };

  const handleToggleStatus = (fenceId: number) => {
    onUpdateFences(fences.map(f => f.id === fenceId ? { ...f, isActive: !f.isActive } : f));
  };

  return (
    <>
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">
              Manage Geofences
            </CardTitle>
            <CardDescription>
              View, copy, or delete existing geofences for your vehicles.
            </CardDescription>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                  {headers.map((header) => (
                    <SortableHeader
                      key={header.key as string}
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
                              <AlertDialogAction onClick={() => handleDelete(row.id)}>
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
              {firstRowIndex}-{lastRowIndex} of {filteredAndSortedData.length}
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
      <CopyFenceDialog
        open={isCopyDialogOpen}
        onOpenChange={setIsCopyDialogOpen}
        fence={selectedFence}
      />
      <EditFenceDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        fence={selectedFence}
        onSave={handleSaveEdit}
      />
    </>
  );
};

export default ManageFenceTable;