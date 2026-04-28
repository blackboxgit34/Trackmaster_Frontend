import { useState, useEffect } from 'react';
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
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';

const FuelManagementSettings = () => {
  const { fuelThresholds, updateFuelThresholds } = useSettings();
  const { toast } = useToast();

  const [low, setLow] = useState(String(fuelThresholds.low));
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setLow(String(fuelThresholds.low));
  }, [fuelThresholds.low]);

  const isDirty = Number(low) !== fuelThresholds.low;

  const handleSaveChanges = () => {
    updateFuelThresholds({ low: Number(low) });
    toast({
      variant: 'success',
      title: 'Settings Saved',
      description: 'Fuel management thresholds have been updated.',
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fuel Management</CardTitle>
        <CardDescription>
          Define the threshold for low fuel level alerts and reports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="low-fuel">Low Fuel Threshold (Liters)</Label>
          <Input
            id="low-fuel"
            type="number"
            value={low}
            onChange={(e) => setLow(e.target.value)}
            placeholder="e.g., 50"
          />
          <p className="text-sm text-muted-foreground">
            Vehicles with fuel levels below this value will be considered 'Low'.
          </p>
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4 flex items-center">
        <Button onClick={handleSaveChanges} disabled={!isDirty}>Save Changes</Button>
        {isSaved && (
          <div className="flex items-center gap-2 text-sm text-green-600 ml-4">
            <Check className="h-4 w-4" />
            <span>Saved!</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default FuelManagementSettings;