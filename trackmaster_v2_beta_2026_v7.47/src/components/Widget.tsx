import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EyeOff } from 'lucide-react';
import type { DashboardItem } from '@/data/mockData';

type WidgetProps = {
  item: DashboardItem;
  isCustomizing: boolean;
  onHide: () => void;
};

const Widget = ({ item, isCustomizing, onHide }: WidgetProps) => {
  return (
    <Card className="relative">
      {isCustomizing && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onHide}
        >
          <EyeOff className="h-4 w-4" />
          <span className="sr-only">Hide widget</span>
        </Button>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          {item.icon && <item.icon className="h-5 w-5 text-muted-foreground" />}
          {item.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{item.value}</div>
        <p className="text-xs text-muted-foreground">{item.change}</p>
      </CardContent>
    </Card>
  );
};

export default Widget;
