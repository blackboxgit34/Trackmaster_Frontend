import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/theme-provider';
import { useSettings } from '@/context/SettingsContext';
import { Sun, Moon, Laptop, UserCheck } from 'lucide-react';

const AppearanceSettings = () => {
  const { theme, setTheme, menuPosition, setMenuPosition } = useTheme();
  const { uiSettings, updateUiSettings } = useSettings();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the look and feel of the application. Changes are saved automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-1">
              <Button
                variant={theme === 'light' ? 'default' : 'ghost'}
                onClick={(e) => setTheme('light', e)}
                className="flex items-center gap-2"
              >
                <Sun className="h-4 w-4" /> Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'ghost'}
                onClick={(e) => setTheme('dark', e)}
                className="flex items-center gap-2"
              >
                <Moon className="h-4 w-4" /> Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'ghost'}
                onClick={(e) => setTheme('system', e)}
                className="flex items-center gap-2"
              >
                <Laptop className="h-4 w-4" /> System
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Menu Location</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <Button
                variant={menuPosition === 'sidebar' ? 'default' : 'ghost'}
                onClick={() => setMenuPosition('sidebar')}
              >
                Sidebar
              </Button>
              <Button
                variant={menuPosition === 'header' ? 'default' : 'ghost'}
                onClick={() => setMenuPosition('header')}
              >
                Header
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display & Visibility</CardTitle>
          <CardDescription>
            Control the visibility of optional data elements across reports, dashboards, and dialogs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5 pr-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <Label className="text-base font-semibold">Show Driver Name</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Display driver names across reports, tracking tables, and vehicle detail popups. Turn this off if your fleet vehicles do not have dedicated drivers.
              </p>
            </div>
            <Switch
              checked={uiSettings?.showDriverName ?? true}
              onCheckedChange={(checked) => updateUiSettings?.({ showDriverName: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppearanceSettings;