import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTheme } from './theme-provider';
import { Button } from './ui/button';
import { Eye } from 'lucide-react';
import type { DashboardItem } from '@/data/mockData';

interface CustomizationSidebarProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isCustomizationEnabled: boolean;
  setIsCustomizationEnabled: (value: boolean) => void;
  hiddenWidgetIds: string[];
  onShowWidget: (widgetId: string) => void;
  allItems: DashboardItem[];
}

const CustomizationSidebar = ({
  isOpen,
  onOpenChange,
  isCustomizationEnabled,
  setIsCustomizationEnabled,
  hiddenWidgetIds,
  onShowWidget,
  allItems,
}: CustomizationSidebarProps) => {
  const { menuPosition, setMenuPosition } = useTheme();
  const hiddenWidgets = allItems.filter((item) => hiddenWidgetIds.includes(item.id));

  const formatWidgetName = (id: string) => {
    return id
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[350px] sm:w-[400px] bg-card text-card-foreground border-border">
        <SheetHeader>
          <SheetTitle>Customize Dashboard</SheetTitle>
          <SheetDescription>
            Personalize your dashboard layout, theme, and widgets.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-8">
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Layout</h4>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="customization-mode" className="text-base">
                  Enable Drag &amp; Drop
                </Label>
                <p className="text-sm text-muted-foreground">
                  Rearrange widgets on your dashboard.
                </p>
              </div>
              <Switch
                id="customization-mode"
                checked={isCustomizationEnabled}
                onCheckedChange={setIsCustomizationEnabled}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">
                  Menu Location
                </Label>
                <p className="text-sm text-muted-foreground">
                  Display menu in sidebar or header.
                </p>
              </div>
              <div className="flex rounded-md bg-muted p-1">
                <Button 
                  onClick={() => setMenuPosition('sidebar')} 
                  variant={menuPosition === 'sidebar' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-sm px-3"
                >
                  Sidebar
                </Button>
                <Button 
                  onClick={() => setMenuPosition('header')} 
                  variant={menuPosition === 'header' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-sm px-3"
                >
                  Header
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Hidden Widgets</h4>
            <div className="space-y-2 rounded-lg border border-border p-4">
              {hiddenWidgets.length > 0 ? (
                hiddenWidgets.map((widget) => (
                  <div key={widget.id} className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{formatWidgetName(widget.id)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onShowWidget(widget.id)}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Show {widget.id}</span>
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No hidden widgets.</p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CustomizationSidebar;