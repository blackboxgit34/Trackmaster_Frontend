import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, PlusCircle, Trash2, Check } from 'lucide-react';
import { actualVehicles } from '@/data/mockData';
import { VehicleCombobox } from '@/components/VehicleCombobox';
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
import { useSettings } from '@/context/SettingsContext';

interface ThresholdOverride {
  id: string;
  alertType: 'high-rpm' | 'high-temp' | 'low-temp' | 'hydraulic-temp' | 'low-hydraulic-temp' | 'overIdling' | 'service';
  applyTo: 'type' | 'vehicle';
  target: string;
  value: number;
  preAlert?: number;
  unit?: 'min' | 'hr';
}

const initialOverrides: ThresholdOverride[] = [
  { id: 'override-1', alertType: 'hydraulic-temp', applyTo: 'type', target: 'Mini Excavator', value: 85 },
  { id: 'override-2', alertType: 'high-temp', applyTo: 'vehicle', target: 'VIO-001', value: 105 },
  { id: 'override-3', alertType: 'overIdling', applyTo: 'type', target: 'Compact Wheel Loader', value: 20, unit: 'min' },
];

const alertTypeLabels = {
  'high-rpm': 'High RPM',
  'high-temp': 'High Engine Temp',
  'low-temp': 'Low Engine Temp',
  'hydraulic-temp': 'High Hydraulic Temp',
  'low-hydraulic-temp': 'Low Hydraulic Temp',
  overIdling: 'Over-Idling',
  service: 'Service Threshold',
};

const alertTypeUnits = {
  'high-rpm': 'RPM',
  'high-temp': '°C',
  'low-temp': '°C',
  'hydraulic-temp': '°C',
  'low-hydraulic-temp': '°C',
  overIdling: 'min',
  service: 'hrs',
};

const FleetSettings = () => {
  const { toast } = useToast();
  const { fleetThresholds, updateFleetThresholds } = useSettings();

  const [units, setUnits] = useState({ distance: 'km', fuel: 'liters', temp: 'celsius' });
  const [formState, setFormState] = useState({
    rpm: String(fleetThresholds.rpm),
    overspeed: String(fleetThresholds.overspeed),
    engineTemp: { low: String(fleetThresholds.engineTemp.low), high: String(fleetThresholds.engineTemp.high) },
    hydraulicTemp: { low: String(fleetThresholds.hydraulicTemp.low), high: String(fleetThresholds.hydraulicTemp.high) },
    overIdling: { value: String(fleetThresholds.overIdling.value), unit: fleetThresholds.overIdling.unit },
    overStoppage: { value: String(fleetThresholds.overStoppage.value), unit: fleetThresholds.overStoppage.unit },
    service: { value: String(fleetThresholds.service.value), preAlert: String(fleetThresholds.service.preAlert) },
  });
  
  const [initialUnits, setInitialUnits] = useState(units);
  const [unitsSaved, setUnitsSaved] = useState(false);
  const [thresholdsSaved, setThresholdsSaved] = useState(false);

  const unitsDirty = JSON.stringify(units) !== JSON.stringify(initialUnits);
  const thresholdsDirty = JSON.stringify(formState) !== JSON.stringify({
    rpm: String(fleetThresholds.rpm),
    overspeed: String(fleetThresholds.overspeed),
    engineTemp: { low: String(fleetThresholds.engineTemp.low), high: String(fleetThresholds.engineTemp.high) },
    hydraulicTemp: { low: String(fleetThresholds.hydraulicTemp.low), high: String(fleetThresholds.hydraulicTemp.high) },
    overIdling: { value: String(fleetThresholds.overIdling.value), unit: fleetThresholds.overIdling.unit },
    overStoppage: { value: String(fleetThresholds.overStoppage.value), unit: fleetThresholds.overStoppage.unit },
    service: { value: String(fleetThresholds.service.value), preAlert: String(fleetThresholds.service.preAlert) },
  });

  const [overrides, setOverrides] = useState<ThresholdOverride[]>(initialOverrides);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingOverrideId, setEditingOverrideId] = useState<string | null>(null);
  const [newOverride, setNewOverride] = useState({
    alertType: 'high-temp' as ThresholdOverride['alertType'],
    applyTo: 'type' as ThresholdOverride['applyTo'],
    target: '',
    value: '',
    preAlert: '',
    unit: 'min' as 'min' | 'hr',
  });

  const vehicleTypes = useMemo(() => [...new Set(actualVehicles.map(m => m.type))], []);
  const vehiclesForCombobox = useMemo(() => actualVehicles.map(m => ({ id: m.id, name: m.name })), []);

  const handleSaveUnits = () => {
    console.log('Saving units:', units);
    toast({ title: 'Units Saved', description: 'Default measurement units have been updated.' });
    setInitialUnits(units);
    setUnitsSaved(true);
    setTimeout(() => setUnitsSaved(false), 3000);
  };

  const handleSaveThresholds = () => {
    const newThresholds = {
      rpm: Number(formState.rpm),
      overspeed: Number(formState.overspeed),
      engineTemp: { low: Number(formState.engineTemp.low), high: Number(formState.engineTemp.high) },
      hydraulicTemp: { low: Number(formState.hydraulicTemp.low), high: Number(formState.hydraulicTemp.high) },
      overIdling: { value: Number(formState.overIdling.value), unit: formState.overIdling.unit },
      overStoppage: { value: Number(formState.overStoppage.value), unit: formState.overStoppage.unit },
      service: { value: Number(formState.service.value), preAlert: Number(formState.service.preAlert) },
    };
    updateFleetThresholds(newThresholds);
    toast({ title: 'Thresholds Saved', description: 'Default alert thresholds have been updated.' });
    setThresholdsSaved(true);
    setTimeout(() => setThresholdsSaved(false), 3000);
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingOverrideId(null);
    setNewOverride({ alertType: 'high-temp', applyTo: 'type', target: '', value: '', preAlert: '', unit: 'min' });
  };

  const handleAddNewClick = () => {
    setEditingOverrideId(null);
    setNewOverride({ alertType: 'high-temp', applyTo: 'type', target: '', value: '', preAlert: '', unit: 'min' });
    setIsAddingNew(true);
  };

  const handleEditClick = (override: ThresholdOverride) => {
    setEditingOverrideId(override.id);
    setNewOverride({
      alertType: override.alertType,
      applyTo: override.applyTo,
      target: override.target,
      value: String(override.value),
      preAlert: String(override.preAlert || ''),
      unit: override.unit || 'min',
    });
    setIsAddingNew(false);
  };

  const handleSaveOverride = () => {
    if (!newOverride.target || !newOverride.value) {
      toast({
        title: 'Incomplete Information',
        description: 'Please fill out all fields for the new override.',
        variant: 'destructive',
      });
      return;
    }

    if (editingOverrideId) {
      setOverrides(prev =>
        prev.map(o =>
          o.id === editingOverrideId
            ? {
                ...o,
                alertType: newOverride.alertType,
                applyTo: newOverride.applyTo,
                target: newOverride.target,
                value: Number(newOverride.value),
                preAlert: newOverride.alertType === 'service' ? Number(newOverride.preAlert) : undefined,
                unit: newOverride.alertType === 'overIdling' ? newOverride.unit : undefined,
              }
            : o
        )
      );
      toast({
        title: 'Override Updated',
        description: 'The custom threshold has been updated.',
      });
    } else {
      const newId = `override-${Date.now()}`;
      setOverrides(prev => [
        ...prev,
        {
          id: newId,
          alertType: newOverride.alertType,
          applyTo: newOverride.applyTo,
          target: newOverride.target,
          value: Number(newOverride.value),
          preAlert: newOverride.alertType === 'service' ? Number(newOverride.preAlert) : undefined,
          unit: newOverride.alertType === 'overIdling' ? newOverride.unit : undefined,
        },
      ]);
      toast({
        title: 'Override Added',
        description: 'The new custom threshold has been saved.',
      });
    }
    handleCancel();
  };

  const handleDeleteOverride = (id: string) => {
    setOverrides(prev => prev.filter(o => o.id !== id));
    toast({
      title: 'Override Removed',
      description: 'The custom threshold has been deleted.',
      variant: 'destructive',
    });
  };

  const renderOverrideForm = () => (
    <div className="p-4 border-t bg-muted/50 space-y-4">
      <h4 className="font-semibold">{editingOverrideId ? 'Edit Custom Threshold' : 'New Custom Threshold'}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <div className="space-y-2">
          <Label>Alert Type</Label>
          <Select
            value={newOverride.alertType}
            onValueChange={(value: ThresholdOverride['alertType']) => setNewOverride(prev => ({ ...prev, alertType: value, unit: 'min' }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high-rpm">High RPM</SelectItem>
              <SelectItem value="high-temp">High Engine Temp</SelectItem>
              <SelectItem value="low-temp">Low Engine Temp</SelectItem>
              <SelectItem value="hydraulic-temp">High Hydraulic Temp</SelectItem>
              <SelectItem value="low-hydraulic-temp">Low Hydraulic Temp</SelectItem>
              <SelectItem value="overIdling">Over-Idling</SelectItem>
              <SelectItem value="service">Service Threshold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Apply To</Label>
          <Select
            value={newOverride.applyTo}
            onValueChange={(value: ThresholdOverride['applyTo']) => setNewOverride(prev => ({ ...prev, applyTo: value, target: '' }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="type">Vehicle Type</SelectItem>
              <SelectItem value="vehicle">Specific Vehicle</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Target</Label>
          {newOverride.applyTo === 'type' ? (
            <Select value={newOverride.target} onValueChange={(value) => setNewOverride(prev => ({ ...prev, target: value }))}>
              <SelectTrigger><SelectValue placeholder="Select a type..." /></SelectTrigger>
              <SelectContent>
                {vehicleTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <VehicleCombobox
              vehicles={vehiclesForCombobox}
              value={newOverride.target}
              onChange={(value) => setNewOverride(prev => ({ ...prev, target: value }))}
              className="w-full"
            />
          )}
        </div>
        <div className="space-y-2 lg:col-span-2">
          <Label>Threshold</Label>
          {newOverride.alertType === 'overIdling' ? (
            <div className="relative">
              <Input
                type="number"
                value={newOverride.value}
                onChange={(e) => setNewOverride(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Value"
                className="pr-24"
              />
              <div className="absolute inset-y-0 right-0 flex items-center">
                <Select
                  value={newOverride.unit}
                  onValueChange={(value: 'min' | 'hr') => setNewOverride(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger className="w-[90px] border-0 bg-transparent focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="min">Minutes</SelectItem>
                    <SelectItem value="hr">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : newOverride.alertType === 'service' ? (
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                value={newOverride.value}
                onChange={(e) => setNewOverride(prev => ({ ...prev, value: e.target.value }))}
                placeholder={`Interval (hrs)`}
              />
              <Input
                type="number"
                value={newOverride.preAlert}
                onChange={(e) => setNewOverride(prev => ({ ...prev, preAlert: e.target.value }))}
                placeholder={`Pre-Alert (hrs)`}
              />
            </div>
          ) : (
            <Input
              type="number"
              value={newOverride.value}
              onChange={(e) => setNewOverride(prev => ({ ...prev, value: e.target.value }))}
              placeholder={`Value in ${alertTypeUnits[newOverride.alertType]}`}
            />
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSaveOverride} disabled={!newOverride.target || !newOverride.value}>
          {editingOverrideId ? 'Update Override' : 'Save Override'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Default Measurement Units</CardTitle>
          <CardDescription>
            Set the default units for distance, fuel, and temperature across the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="distance-unit">Distance</Label>
            <Select value={units.distance} onValueChange={(value) => setUnits(prev => ({ ...prev, distance: value }))}>
              <SelectTrigger id="distance-unit">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="km">Kilometers (km)</SelectItem>
                <SelectItem value="mi">Miles (mi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuel-unit">Fuel</Label>
            <Select value={units.fuel} onValueChange={(value) => setUnits(prev => ({ ...prev, fuel: value }))}>
              <SelectTrigger id="fuel-unit">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="liters">Liters (L)</SelectItem>
                <SelectItem value="gallons">Gallons (gal)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="temp-unit">Temperature</Label>
            <Select value={units.temp} onValueChange={(value) => setUnits(prev => ({ ...prev, temp: value }))}>
              <SelectTrigger id="temp-unit">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="celsius">Celsius (°C)</SelectItem>
                <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 flex items-center">
          <Button onClick={handleSaveUnits} disabled={!unitsDirty}>Save Units</Button>
          {unitsSaved && (
            <div className="flex items-center gap-2 text-sm text-green-600 ml-4">
              <Check className="h-4 w-4" />
              <span>Saved!</span>
            </div>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Alert Thresholds</CardTitle>
          <CardDescription>
            Define the default values that trigger automated alerts for your fleet.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-2">
            <Label htmlFor="rpm-threshold">High RPM Threshold</Label>
            <Input id="rpm-threshold" type="number" value={formState.rpm} onChange={(e) => setFormState((prev) => ({ ...prev, rpm: e.target.value }))} placeholder="e.g., 3000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="overspeed-threshold">Overspeed Threshold (km/h)</Label>
            <Input id="overspeed-threshold" type="number" value={formState.overspeed} onChange={(e) => setFormState((prev) => ({ ...prev, overspeed: e.target.value }))} placeholder="e.g., 80" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="over-idling">Over-Idling Threshold</Label>
            <div className="relative">
              <Input id="over-idling" type="number" value={formState.overIdling.value} onChange={(e) => setFormState((prev) => ({ ...prev, overIdling: { ...prev.overIdling, value: e.target.value } }))} className="pr-24" />
              <div className="absolute inset-y-0 right-0 flex items-center">
                <Select value={formState.overIdling.unit} onValueChange={(value: 'min' | 'hr') => setFormState((prev) => ({ ...prev, overIdling: { ...prev.overIdling, unit: value } }))}>
                  <SelectTrigger className="w-[90px] border-0 bg-transparent focus:ring-0 focus:ring-offset-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="min">Minutes</SelectItem>
                    <SelectItem value="hr">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="over-stoppage">Over-Stoppage Threshold</Label>
            <div className="relative">
              <Input id="over-stoppage" type="number" value={formState.overStoppage.value} onChange={(e) => setFormState((prev) => ({ ...prev, overStoppage: { ...prev.overStoppage, value: e.target.value } }))} className="pr-24" />
              <div className="absolute inset-y-0 right-0 flex items-center">
                <Select value={formState.overStoppage.unit} onValueChange={(value: 'min' | 'hr') => setFormState((prev) => ({ ...prev, overStoppage: { ...prev.overStoppage, unit: value } }))}>
                  <SelectTrigger className="w-[90px] border-0 bg-transparent focus:ring-0 focus:ring-offset-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="min">Minutes</SelectItem>
                    <SelectItem value="hr">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Service Threshold (hrs)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="service" className="text-xs text-muted-foreground">Interval</Label>
                <Input id="service" type="number" value={formState.service.value} onChange={(e) => setFormState((prev) => ({ ...prev, service: { ...prev.service, value: e.target.value } }))} placeholder="e.g., 500" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="service-pre-alert" className="text-xs text-muted-foreground">Pre-Alert Before</Label>
                <Input id="service-pre-alert" type="number" value={formState.service.preAlert} onChange={(e) => setFormState((prev) => ({ ...prev, service: { ...prev.service, preAlert: e.target.value } }))} placeholder="e.g., 50" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Engine Temp Thresholds (°C)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="engine-low" className="text-xs text-muted-foreground">Low</Label>
                <Input id="engine-low" type="number" value={formState.engineTemp.low} onChange={e => setFormState(prev => ({ ...prev, engineTemp: { ...prev.engineTemp, low: e.target.value } }))} placeholder="e.g., 75" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="engine-high" className="text-xs text-muted-foreground">High</Label>
                <Input id="engine-high" type="number" value={formState.engineTemp.high} onChange={e => setFormState(prev => ({ ...prev, engineTemp: { ...prev.engineTemp, high: e.target.value } }))} placeholder="e.g., 95" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Hydraulic Temp Thresholds (°C)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="hydraulic-low" className="text-xs text-muted-foreground">Low</Label>
                <Input id="hydraulic-low" type="number" value={formState.hydraulicTemp.low} onChange={e => setFormState(prev => ({ ...prev, hydraulicTemp: { ...prev.hydraulicTemp, low: e.target.value } }))} placeholder="e.g., 50" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hydraulic-high" className="text-xs text-muted-foreground">High</Label>
                <Input id="hydraulic-high" type="number" value={formState.hydraulicTemp.high} onChange={e => setFormState(prev => ({ ...prev, hydraulicTemp: { ...prev.hydraulicTemp, high: e.target.value } }))} placeholder="e.g., 80" />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 flex items-center">
          <Button onClick={handleSaveThresholds} disabled={!thresholdsDirty}>Save Default Thresholds</Button>
          {thresholdsSaved && (
            <div className="flex items-center gap-2 text-sm text-green-600 ml-4">
              <Check className="h-4 w-4" />
              <span>Saved!</span>
            </div>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Alert Thresholds</CardTitle>
          <CardDescription>
            Set specific thresholds for vehicle types or individual vehicles. These will override the defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alert Type</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overrides.map(override => (
                <React.Fragment key={override.id}>
                  <TableRow>
                    <TableCell>{alertTypeLabels[override.alertType]}</TableCell>
                    <TableCell className="capitalize">{override.applyTo === 'vehicle' ? 'Vehicle' : 'Type'}</TableCell>
                    <TableCell className="font-medium">{override.target}</TableCell>
                    <TableCell>
                      {override.value}{' '}
                      {override.alertType === 'overIdling'
                        ? override.unit === 'hr' ? 'Hours' : 'Minutes'
                        : alertTypeUnits[override.alertType]}
                      {override.alertType === 'service' && override.preAlert && (
                        <span className="text-muted-foreground text-xs"> (Pre-alert: {override.preAlert} hrs)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(override)}>
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
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the custom threshold for "{override.target}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteOverride(override.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                  {editingOverrideId === override.id && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        {renderOverrideForm()}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          {!isAddingNew && !editingOverrideId && (
            <div className="pt-4">
              <Button variant="outline" onClick={handleAddNewClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Override
              </Button>
            </div>
          )}
          {isAddingNew && renderOverrideForm()}
        </CardContent>
      </Card>
    </div>
  );
};

export default FleetSettings;