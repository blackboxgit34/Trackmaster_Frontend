import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface PlaceholderWidgetProps {
  title: string;
}

const PlaceholderWidget = ({ title }: PlaceholderWidgetProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-32 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground">Placeholder Content</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlaceholderWidget;