import { useState, useMemo } from 'react';
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
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { actualVehicles, VEHICLE_TYPES } from '@/data/mockData';
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
import AddVehicleDialog, { type AddVehicleFormValues } from './AddVehicleDialog';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState(actualVehicles);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<(typeof actualVehicles)[0] | null>(null);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const filteredData = useMemo(() => {
    return vehicles.filter(vehicle =>
      vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vehicles, searchTerm]);

  const pageCount = Math.ceil(filteredData.length / pagination.pageSize);
  const paginatedData = filteredData.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );
  const firstRowIndex = pagination.pageIndex * pagination.pageSize + 1;
  const lastRowIndex = Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredData.length);

  const handleAddVehicle = (data: AddVehicleFormValues) => {
    const newVehicle = {
      id: data.vehicleRegNo,
      name: data.vehicleName,
      type: data.vehicleType,
      model: data.model,
      make: data.make || VEHICLE_TYPES[data.vehicleType as keyof typeof VEHICLE_TYPES]?.make || 'N/A',
      driver: data.driver || null,
      odometer: Number(data.vehicleOdometer) || 0,
      status: (data.vehicleStatus as 'In Use' | 'Inactive') || 'In Use',
      blackbox: true,
      remarks: data.remarks || '',
      fuelTankCapacity: Number(data.fuelTankCapacity) || 0,
    };
    setVehicles(prev => [...prev, newVehicle]);
    toast({
      variant: 'success',
      title: 'Vehicle Added',
      description: `${data.vehicleName} has been added to your fleet.`,
    });
  };

  const handleEditVehicle = (data: AddVehicleFormValues) => {
    setVehicles(prev => prev.map(m => m.id === data.vehicleRegNo ? { 
        ...m, 
        name: data.vehicleName,
        type: data.vehicleType,
        model: data.model,
        make: data.make || VEHICLE_TYPES[data.vehicleType as keyof typeof VEHICLE_TYPES]?.make || 'N/A',
        driver: data.driver || null,
        odometer: Number(data.vehicleOdometer) || 0,
        status: (data.vehicleStatus as 'In Use' | 'Inactive') || m.status,
        remarks: data.remarks || '',
        fuelTankCapacity: Number(data.fuelTankCapacity) || m.fuelTankCapacity,
    } : m));
    toast({
      variant: 'success',
      title: 'Vehicle Updated',
      description: `${data.vehicleName} has been updated.`,
    });
    setEditingVehicle(null);
  };

  const handleRemoveVehicle = (vehicleId: string) => {
    const vehicleToRemove = vehicles.find(m => m.id === vehicleId);
    setVehicles(prev => prev.filter(m => m.id !== vehicleId));
    toast({
      title: 'Vehicle Removed',
      description: `${vehicleToRemove?.name} has been removed from your fleet.`,
      variant: 'destructive',
    });
  };

  const vehicleToEditForDialog = editingVehicle ? {
    vehicleRegNo: editingVehicle.id,
    vehicleName: editingVehicle.name,
    vehicleType: editingVehicle.type,
    model: editingVehicle.model,
    make: editingVehicle.make,
    driver: editingVehicle.driver || '',
    vehicleOdometer: String(editingVehicle.odometer),
    vehicleStatus: editingVehicle.status,
    remarks: editingVehicle.remarks,
    fuelTankCapacity: String(editingVehicle.fuelTankCapacity),
  } : null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Vehicle Management</CardTitle>
            <CardDescription>
              Add, edit, and manage the vehicles in your fleet.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button onClick={() => { setEditingVehicle(null); setIsAddDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>GPS Odometer Reading</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Blackbox Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <img
                        src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=200&auto=format&fit=crop"
                        alt={vehicle.name}
                        className="h-10 w-10 object-cover rounded-md"
                      />
                      <div>
                        <div className="font-semibold">{vehicle.name}</div>
                        <div className="text-sm text-muted-foreground">{vehicle.type}</div>
                        <div className="text-xs text-muted-foreground">
                          Make: {vehicle.make} / Model: {vehicle.model}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {vehicle.driver ? (
                      <span className="text-blue-500 font-medium">{vehicle.driver}</span>
                    ) : (
                      <span className="text-red-500 font-medium">No Driver Assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {vehicle.odometer.toLocaleString()} km
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-full',
                      vehicle.status === 'In Use'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300'
                    )}>
                      {vehicle.status}
                    </span>
                  </TableCell>
                  <TableCell>{vehicle.remarks}</TableCell>
                  <TableCell>
                    {vehicle.blackbox ? 'Yes' : 'No'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingVehicle(vehicle); setIsAddDialogOpen(true); }}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>View</DropdownMenuItem>
                        <DropdownMenuItem>Add Document Reminder</DropdownMenuItem>
                        <DropdownMenuItem>Add Service Reminder</DropdownMenuItem>
                        <DropdownMenuItem>Add Repair/Maintenance</DropdownMenuItem>
                        <DropdownMenuItem>Add Fuel Entry</DropdownMenuItem>
                        <DropdownMenuItem>Add Tyre Fitting</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-500">
                              Remove
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {vehicle.name} from your fleet.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveVehicle(vehicle.id)}>
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => {
                setPagination({ pageIndex: 0, pageSize: Number(value) });
              }}
            >
              <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary">
                <SelectValue placeholder={pagination.pageSize} />
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
              {filteredData.length > 0 ? `${firstRowIndex}-${lastRowIndex} of ${filteredData.length}` : '0-0 of 0'}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => setPagination((p) => ({ ...p, pageIndex: 0 }))}
                disabled={pagination.pageIndex === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))}
                disabled={pagination.pageIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                disabled={pagination.pageIndex >= pageCount - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => setPagination((p) => ({ ...p, pageIndex: pageCount - 1 }))}
                disabled={pagination.pageIndex >= pageCount - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
      <AddVehicleDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={editingVehicle ? handleEditVehicle : handleAddVehicle}
        vehicleToEdit={vehicleToEditForDialog}
      />
    </>
  );
};

export default VehicleManagement;