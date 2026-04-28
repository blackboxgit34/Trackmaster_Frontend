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
import { actualVehicles } from '@/data/mockData';
import type { GeofenceShape as Geofence } from '@/data/geofenceMapData';
import { useToast } from '@/hooks/use-toast';

interface CopyFenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fence: Geofence | null;
}

const vehicleTypes = ['All Types', ...Array.from(new Set(actualVehicles.map(m => m.type)))];

const CopyFenceDialog = ({ open, onOpenChange, fence }: CopyFenceDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [newFenceName, setNewFenceName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (fence) {
      setNewFenceName(`${fence.name} - Copy`);
    }
  }, [fence]);

  const filteredVehicles = useMemo(() => {
    return actualVehicles.filter(vehicle => {
      const matchesType = selectedType === 'All Types' || vehicle.type === selectedType;
      const matchesSearch = vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            vehicle.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [searchTerm, selectedType]);

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
    if (checked === true) {
      const allFilteredIds = new Set(filteredVehicles.map(m => m.id));
      setSelectedVehicles(allFilteredIds);
    } else {
      setSelectedVehicles(new Set());
    }
  };

  const handleCopy = () => {
    if (!newFenceName.trim()) {
      toast({
        title: "Invalid Fence Name",
        description: "Please provide a name for the new geofence.",
        variant: "destructive",
      });
      return;
    }
    if (selectedVehicles.size === 0) {
      toast({
        title: "No vehicles selected",
        description: "Please select at least one vehicle to assign the new geofence to.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      variant: 'success',
      title: "Geofence Duplicated!",
      description: `New geofence "${newFenceName}" has been created and assigned to ${selectedVehicles.size} vehicle(s).`,
    });
    onClose();
  };

  const onClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSearchTerm('');
      setSelectedType('All Types');
      setSelectedVehicles(new Set());
      setNewFenceName('');
    }, 300);
  };

  const allFilteredSelected = filteredVehicles.length > 0 && filteredVehicles.every(m => selectedVehicles.has(m.id));
  const someFilteredSelected = filteredVehicles.some(m => selectedVehicles.has(m.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Duplicate and Assign Geofence</DialogTitle>
          <DialogDescription>
            Create a copy of <span className="font-semibold text-foreground">{fence?.name}</span>, rename it, and assign it to multiple vehicles.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="new-fence-name">New Fence Name</Label>
            <div className="relative mt-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-fence-name"
                placeholder="Enter a name for the new fence"
                value={newFenceName}
                onChange={(e) => setNewFenceName(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle type" />
              </SelectTrigger>
              <SelectContent>
                {vehicleTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md">
            <div className="flex items-center p-3 border-b">
              <Checkbox
                id="select-all"
                checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
              />
              <Label htmlFor="select-all" className="ml-3 text-sm font-medium">
                Select all ({filteredVehicles.length} vehicles found)
              </Label>
            </div>
            <ScrollArea className="h-56">
              <div className="p-3 space-y-2">
                {filteredVehicles.map(vehicle => (
                  <div key={vehicle.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                    <Checkbox
                      id={vehicle.id}
                      checked={selectedVehicles.has(vehicle.id)}
                      onCheckedChange={() => handleSelectVehicle(vehicle.id)}
                    />
                    <Label htmlFor={vehicle.id} className="w-full cursor-pointer">
                      <div className="flex justify-between">
                        <span className="font-semibold">{vehicle.name}</span>
                        <span className="text-xs text-muted-foreground">{vehicle.id}</span>
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCopy} disabled={selectedVehicles.size === 0}>
            Duplicate & Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CopyFenceDialog;