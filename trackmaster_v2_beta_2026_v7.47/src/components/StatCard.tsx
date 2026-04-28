import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  Icon: LucideIcon;
  color: string;
}

const colorStyles: { [key: string]: { card: string; icon: string } } = {
  blue: { card: 'bg-blue-50 dark:bg-blue-900/30', icon: 'text-blue-500' },
  cyan: { card: 'bg-cyan-50 dark:bg-cyan-900/30', icon: 'text-cyan-500' },
  yellow: { card: 'bg-yellow-50 dark:bg-yellow-900/30', icon: 'text-yellow-500' },
  purple: { card: 'bg-purple-50 dark:bg-purple-900/30', icon: 'text-purple-500' },
  orange: { card: 'bg-orange-50 dark:bg-orange-900/30', icon: 'text-orange-500' },
  red: { card: 'bg-red-50 dark:bg-red-900/30', icon: 'text-red-500' },
};

const StatCard: React.FC<StatCardProps> = ({ title, value, unit, Icon, color }) => {
  const styles = colorStyles[color] ?? { card: '', icon: '' };

  return (
    <Card className={cn('p-4 rounded-xl shadow-sm border-0', styles.card)}>
      <CardContent className="p-0 flex items-center gap-4">
        <div className="bg-white dark:bg-card rounded-full p-3 shadow-sm">
          <Icon className={cn('h-6 w-6', styles.icon)} />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">
            {value} <span className="text-base font-medium">{unit}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
