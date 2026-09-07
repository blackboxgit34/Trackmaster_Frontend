import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/context/SettingsContext';

const TemporarySettings = () => {
  const { uiSettings, updateUiSettings } = useSettings();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Display & UI Settings</CardTitle>
          <CardDescription>
            Options for testing different UI variations and setting global date/time display preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Time Display Format</Label>
              <p className="text-sm text-muted-foreground">
                Choose between 12-Hour format (e.g. 02:30 PM) or 24-Hour format (e.g. 14:30) across all reports and dashboards.
              </p>
            </div>
            <Select
              value={uiSettings?.timeFormat ?? '12h'}
              onValueChange={(val: '12h' | '24h') => updateUiSettings?.({ timeFormat: val })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-Hour (02:30 PM)</SelectItem>
                <SelectItem value="24h">24-Hour (14:30)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Minimal Map Icons</Label>
              <p className="text-sm text-muted-foreground">
                Use simple SVG dots for vehicles on the "Vehicle On Map" page to greatly improve performance when viewing large fleets. This disables vehicle images and pulsing halos.
              </p>
            </div>
            <Switch
              checked={uiSettings?.minimalMapIcons ?? false}
              onCheckedChange={(checked) => updateUiSettings?.({ minimalMapIcons: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemporarySettings;