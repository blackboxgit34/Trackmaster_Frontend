import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/components/theme-provider';
import { Sun, Moon, Laptop } from 'lucide-react';

const AppearanceSettings = () => {
  const { theme, setTheme, menuPosition, setMenuPosition } = useTheme();

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
    </div>
  );
};

export default AppearanceSettings;