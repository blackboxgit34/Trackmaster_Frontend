import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { Fuel, Thermometer, Check, Layers, Snowflake, Truck } from 'lucide-react';

const AddonSettings = () => {
  const { module } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    fuelThresholds,
    updateFuelThresholds,
    fleetThresholds,
    updateFleetThresholds,
    reeferThresholds,
    updateReeferThresholds,
  } = useSettings();

  // Active module tab: 'fuel' or 'temperature'
  const activeModule = module === 'temp' || module === 'temperature' ? 'temperature' : 'fuel';

  // --- Fuel Module Form State ---
  const [fuelState, setFuelState] = useState({
    lowFuel: String(fuelThresholds.low),
    fuelUnit: 'liters',
    mileageUnit: 'kml',
    sensorType: 'capacitive',
    tankCapacity: '350',
  });
  const [fuelSaved, setFuelSaved] = useState(false);

  // --- Temperature Module Form State ---
  const [tempState, setTempState] = useState({
    engineHigh: String(fleetThresholds.engineTemp.high),
    engineLow: String(fleetThresholds.engineTemp.low),
    hydraulicHigh: String(fleetThresholds.hydraulicTemp.high),
    hydraulicLow: String(fleetThresholds.hydraulicTemp.low),
    reeferTarget: String(reeferThresholds?.targetTemp ?? -18),
    reeferMin: String(reeferThresholds?.minTemp ?? -25),
    reeferMax: String(reeferThresholds?.maxTemp ?? -10),
    applyToAllVehicles: reeferThresholds?.applyToAllVehicles ?? true,
    humidityMax: '85',
    tempUnit: 'celsius',
    overheatAlert: true,
    pollingInterval: '30',
  });
  const [tempSaved, setTempSaved] = useState(false);

  useEffect(() => {
    setFuelState((prev) => ({ ...prev, lowFuel: String(fuelThresholds.low) }));
  }, [fuelThresholds.low]);

  useEffect(() => {
    setTempState((prev) => ({
      ...prev,
      engineHigh: String(fleetThresholds.engineTemp.high),
      engineLow: String(fleetThresholds.engineTemp.low),
      hydraulicHigh: String(fleetThresholds.hydraulicTemp.high),
      hydraulicLow: String(fleetThresholds.hydraulicTemp.low),
      reeferTarget: String(reeferThresholds?.targetTemp ?? -18),
      reeferMin: String(reeferThresholds?.minTemp ?? -25),
      reeferMax: String(reeferThresholds?.maxTemp ?? -10),
      applyToAllVehicles: reeferThresholds?.applyToAllVehicles ?? true,
    }));
  }, [fleetThresholds.engineTemp, fleetThresholds.hydraulicTemp, reeferThresholds]);

  const handleModuleChange = (value: string) => {
    navigate(`/settings/addon-settings/${value}`);
  };

  const handleSaveFuelSettings = () => {
    updateFuelThresholds({ low: Number(fuelState.lowFuel) });
    toast({
      variant: 'success',
      title: 'Fuel Addon Settings Saved',
      description: 'Fuel module thresholds and sensor parameters have been updated.',
    });
    setFuelSaved(true);
    setTimeout(() => setFuelSaved(false), 3000);
  };

  const handleSaveTempSettings = () => {
    updateFleetThresholds({
      engineTemp: { low: Number(tempState.engineLow), high: Number(tempState.engineHigh) },
      hydraulicTemp: { low: Number(tempState.hydraulicLow), high: Number(tempState.hydraulicHigh) },
    });
    updateReeferThresholds?.({
      minTemp: Number(tempState.reeferMin),
      maxTemp: Number(tempState.reeferMax),
      targetTemp: Number(tempState.reeferTarget),
      applyToAllVehicles: tempState.applyToAllVehicles,
    });
    toast({
      variant: 'success',
      title: 'Temperature Settings Saved',
      description: tempState.applyToAllVehicles
        ? `Global default temperature limits (${tempState.reeferMin}°C to ${tempState.reeferMax}°C) applied to all reefer vehicles.`
        : 'Temperature thresholds updated successfully.',
    });
    setTempSaved(true);
    setTimeout(() => setTempSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Submenu Dropdown Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Addon Settings</h2>
            <p className="text-xs text-muted-foreground">Configure module-specific rules, alert thresholds, and sensor preferences</p>
          </div>
        </div>

        {/* Submenu Dropdown & Module Selector */}
        <div className="flex items-center gap-3">
          <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap hidden md:inline">Select Module:</Label>
          <Select value={activeModule} onValueChange={handleModuleChange}>
            <SelectTrigger className="w-[200px] h-9 text-xs font-medium">
              <SelectValue placeholder="Select Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fuel" className="text-xs">
                <div className="flex items-center gap-2">
                  <Fuel className="h-3.5 w-3.5 text-amber-500" />
                  <span>Fuel Module</span>
                </div>
              </SelectItem>
              <SelectItem value="temperature" className="text-xs">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-3.5 w-3.5 text-rose-500" />
                  <span>Temperature Module</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* FUEL MODULE SETTINGS */}
      {activeModule === 'fuel' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-amber-500" />
                    Fuel Level & Alert Thresholds
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Define low fuel alerts, reserve limits, and unit parameters
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="low-fuel" className="text-xs font-semibold">Low Fuel Threshold (Liters)</Label>
                  <Input
                    id="low-fuel"
                    type="number"
                    value={fuelState.lowFuel}
                    onChange={(e) => setFuelState({ ...fuelState, lowFuel: e.target.value })}
                    className="h-9 text-xs"
                    placeholder="e.g. 50"
                  />
                  <p className="text-[11px] text-muted-foreground">Alert triggers when fuel level falls below this value.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Fuel Unit</Label>
                  <Select value={fuelState.fuelUnit} onValueChange={(val) => setFuelState({ ...fuelState, fuelUnit: val })}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="liters" className="text-xs">Liters (L)</SelectItem>
                      <SelectItem value="gallons" className="text-xs">Gallons (Gal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Consumption Unit</Label>
                  <Select value={fuelState.mileageUnit} onValueChange={(val) => setFuelState({ ...fuelState, mileageUnit: val })}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kml" className="text-xs">Kilometers per Liter (km/l)</SelectItem>
                      <SelectItem value="l100" className="text-xs">Liters per 100km (L/100km)</SelectItem>
                      <SelectItem value="mpg" className="text-xs">Miles per Gallon (MPG)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Changes apply to fuel reports and alert engines immediately.</p>
              <div className="flex items-center gap-3">
                {fuelSaved && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <Check className="h-4 w-4" />
                    <span>Saved successfully</span>
                  </div>
                )}
                <Button onClick={handleSaveFuelSettings} size="sm">Save Fuel Settings</Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* TEMPERATURE MODULE SETTINGS */}
      {activeModule === 'temperature' && (
        <div className="space-y-6">

          {/* GLOBAL DEFAULT REEFER TEMPERATURE THRESHOLDS CARD */}
          <Card className="border-sky-500/20 bg-sky-500/5 dark:bg-sky-950/10">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-sky-700 dark:text-sky-400">
                    <Snowflake className="h-4 w-4 text-sky-500" />
                    Global Reefer Min & Max Temperature Defaults (All Vehicles)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Set global minimum and maximum temperature limits. These values will apply as default for all reefer vehicles in your fleet.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 text-[11px] font-semibold border border-sky-200 dark:border-sky-800 shrink-0">
                  <Truck className="h-3.5 w-3.5" />
                  <span>Default for All Reefers</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="global-reefer-min" className="text-xs font-semibold text-foreground">
                    Default Minimum Temp (°C)
                  </Label>
                  <Input
                    id="global-reefer-min"
                    type="number"
                    value={tempState.reeferMin}
                    onChange={(e) => setTempState({ ...tempState, reeferMin: e.target.value })}
                    className="h-9 text-xs bg-background font-medium"
                    placeholder="e.g. -25"
                  />
                  <p className="text-[11px] text-muted-foreground">Alerts when reefer temp falls below this minimum limit for any vehicle.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="global-reefer-max" className="text-xs font-semibold text-foreground">
                    Default Maximum Temp (°C)
                  </Label>
                  <Input
                    id="global-reefer-max"
                    type="number"
                    value={tempState.reeferMax}
                    onChange={(e) => setTempState({ ...tempState, reeferMax: e.target.value })}
                    className="h-9 text-xs bg-background font-medium"
                    placeholder="e.g. -10"
                  />
                  <p className="text-[11px] text-muted-foreground">Alerts when reefer temp rises above this maximum limit for any vehicle.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="humidity-max" className="text-xs font-semibold">Max Cargo Humidity Limit (%)</Label>
                  <Input
                    id="humidity-max"
                    type="number"
                    value={tempState.humidityMax}
                    onChange={(e) => setTempState({ ...tempState, humidityMax: e.target.value })}
                    className="h-9 text-xs bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Temperature Display Unit</Label>
                  <Select value={tempState.tempUnit} onValueChange={(val) => setTempState({ ...tempState, tempUnit: val })}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="celsius" className="text-xs">Celsius (°C)</SelectItem>
                      <SelectItem value="fahrenheit" className="text-xs">Fahrenheit (°F)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between border border-sky-200 dark:border-sky-900/60 p-3 rounded-lg bg-background mt-2">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-sky-500" />
                    <span>Apply these Min/Max limits as default to all reefer vehicles</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    When enabled, all current and newly assigned reefer vehicles automatically inherit these default Min ({tempState.reeferMin}°C) and Max ({tempState.reeferMax}°C) limits.
                  </p>
                </div>
                <Switch
                  checked={tempState.applyToAllVehicles}
                  onCheckedChange={(checked) => setTempState({ ...tempState, applyToAllVehicles: checked })}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Updates cold-chain and temperature reporting thresholds.</p>
              <div className="flex items-center gap-3">
                {tempSaved && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <Check className="h-4 w-4" />
                    <span>Saved successfully</span>
                  </div>
                )}
                <Button onClick={handleSaveTempSettings} size="sm">Save Temperature Settings</Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AddonSettings;
