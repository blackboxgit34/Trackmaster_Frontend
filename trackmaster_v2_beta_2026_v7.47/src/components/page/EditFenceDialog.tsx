import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Tag } from 'lucide-react';
import type { GeofenceShape } from '@/data/geofenceMapData';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/Api';

interface EditFenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fence: GeofenceShape | null;
  vehicles: VehicleListItem[];
  vehicleTypes: string[];
  onSave: (fence: GeofenceShape) => void;
  onSuccess?: () => void;
  setParentLoading?: (loading: boolean) => void;
}

interface VehicleListItem {
  vehName: string;
  bbid: string;
  type: string;
}

interface SaveGeofencePayload {
  FenceId: number;
  FenceName: string;
  Radius: string;
  FenceType: string;
  IsActive: boolean;
  vehicleLists: { VehName: string; BBID: string; Type: string }[];
  latLongList: { latitude: number; longitude: number }[];
}

const EditFenceDialog = ({
  open,
  onOpenChange,
  fence,
  vehicles,
  vehicleTypes,
  onSave,
  onSuccess,
  setParentLoading
}: EditFenceDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [fenceName, setFenceName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (fence) {
      setFenceName(fence.name);
      setSelectedVehicles(new Set(fence.machines));
    }
  }, [fence]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      const matchesType =
        selectedType === 'All Types' || vehicle.type === selectedType;
      const matchesSearch =
        vehicle.vehName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.bbid?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [vehicles, searchTerm, selectedType]);

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
      } else {
        newSet.add(vehicleId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedVehicles(prev => {
      const updated = new Set(prev);
      if (checked === true) {
        filteredVehicles.forEach(vehicle => updated.add(vehicle.bbid));
      } else {
        filteredVehicles.forEach(vehicle => updated.delete(vehicle.bbid));
      }
      return updated;
    });
  };

  const buildLatLongList = (): { latitude: number; longitude: number }[] => {
    if (!fence) return [];

    if (fence.type === 'circle' && fence.center) {
      return [{ latitude: fence.center.lat, longitude: fence.center.lng }];
    }

    if (fence.type === 'polygon' && fence.paths) {
      return fence.paths.map(coord => ({
        latitude: coord.lat,
        longitude: coord.lng,
      }));
    }

    return [];
  };

  const buildVehicleList = (): { VehName: string; BBID: string; Type: string }[] => {
    return vehicles
      .filter(v => selectedVehicles.has(v.bbid))
      .map(v => ({ VehName: v.vehName, BBID: v.bbid, Type: v.type }));
  };

  const handleSaveChanges = async () => {
    if (!fence) return;

    if (!fenceName.trim()) {
      toast({
        title: 'Invalid Fence Name',
        description: 'Please provide a name for the geofence.',
        variant: 'destructive',
      });
      return;
    }

    const payload: SaveGeofencePayload = {
      FenceId: fence.id,
      FenceName: fenceName.trim(),
      Radius: fence.type === 'circle' ? String(fence.radius ?? 0) : '0',
      FenceType: fence.type === 'circle' ? 'Circle' : 'Polygon',
      IsActive: fence.isActive,
      vehicleLists: buildVehicleList(),
      latLongList: buildLatLongList(),
    };

    try {
      setIsSaving(true);
      setParentLoading?.(true);

      const response = await fetch(`${API_BASE_URL}/Geofence/SaveGeofence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to save geofence: ${response.statusText}`);
      }

      const updatedFence: GeofenceShape = {
        ...fence,
        name: fenceName.trim(),
        machines: Array.from(selectedVehicles),
      };

      onSave(updatedFence);
      toast({
        variant: 'success',
        title: 'Fence Updated',
        description: `Geofence "${fenceName}" has been updated successfully.`,
      });
      onClose();
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save geofence';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
      setParentLoading?.(false);
    }
  };

  const onClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSearchTerm('');
      setSelectedType('All Types');
    }, 300);
  };

  const allFilteredSelected =
    filteredVehicles.length > 0 &&
    filteredVehicles.every(m => selectedVehicles.has(m.bbid));
  const someFilteredSelected = filteredVehicles.some(m =>
    selectedVehicles.has(m.bbid)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Geofence</DialogTitle>
          <DialogDescription>
            Update the name and assigned vehicles for{' '}
            <span className="font-semibold text-foreground">{fence?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Fence Name */}
          <div>
            <Label htmlFor="edit-fence-name">Fence Name</Label>
            <div className="relative mt-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="edit-fence-name"
                placeholder="Enter a name for the fence"
                value={fenceName}
                onChange={e => setFenceName(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Search & Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicle..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle type" />
              </SelectTrigger>
              <SelectContent>
                {vehicleTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vehicle List */}
          <div className="border rounded-md">
            <div className="flex items-center p-3 border-b">
              <Checkbox
                id="edit-select-all"
                checked={
                  allFilteredSelected
                    ? true
                    : someFilteredSelected
                      ? 'indeterminate'
                      : false
                }
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
              />
              <Label htmlFor="edit-select-all" className="ml-3 text-sm font-medium">
                Select all ({filteredVehicles.length} vehicles found)
              </Label>
            </div>
            <ScrollArea className="h-56">
              <div className="p-3 space-y-2">
                {filteredVehicles.map(vehicle => (
                  <div
                    key={vehicle.bbid}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted"
                  >
                    <Checkbox
                      id={`edit-${vehicle.bbid}`}
                      checked={selectedVehicles.has(vehicle.bbid)}
                      onCheckedChange={() => handleSelectVehicle(vehicle.bbid)}
                    />
                    <Label
                      htmlFor={`edit-${vehicle.bbid}`}
                      className="w-full cursor-pointer"
                    >
                      <div className="flex justify-between">
                        <span className="font-semibold">{vehicle.vehName}</span>
                        <span className="text-xs text-muted-foreground">
                          {vehicle.bbid}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{vehicle.type}</p>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditFenceDialog;