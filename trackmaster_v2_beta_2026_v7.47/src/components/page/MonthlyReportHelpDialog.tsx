import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { HelpCircle, Milestone, Clock, Eye, AlertTriangle, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MonthlyReportHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MonthlyReportHelpDialog = ({ open, onOpenChange }: MonthlyReportHelpDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <HelpCircle className="h-6 w-6 text-primary" />
            How to Read the Monthly Report
          </DialogTitle>
          <DialogDescription>
            A quick visual guide to reading and analyzing the monthly day-wise distance and halt duration heatmap.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-5">
          {/* Heatmap intensity explanation */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Milestone className="h-4 w-4 text-emerald-600" />
              Dynamic Distance Heatmap
            </h4>
            <p className="text-sm text-muted-foreground">
              Cells are dynamically color-coded based on the distance covered relative to the maximum monthly run:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-lg border bg-muted/30 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-semibold text-muted-foreground">0 km (Idle)</span>
                <span className="text-[11px] text-muted-foreground/80 mt-0.5">Parked / No run</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-emerald-500/10 dark:bg-emerald-500/15 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">1 - 25% Run</span>
                <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">Light Distance</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-emerald-500/25 dark:bg-emerald-500/30 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">25 - 75% Run</span>
                <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300 mt-0.5">Moderate Run</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-emerald-500/40 dark:bg-emerald-500/50 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100">&gt; 75% Run</span>
                <span className="text-[11px] text-emerald-900 dark:text-emerald-200 mt-0.5">Peak Activity</span>
              </div>
            </div>
          </div>

          {/* Halt Alert */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              High Halt Duration Alerts
            </h4>
            <p className="text-sm text-muted-foreground">
              When enabled, any day exceeding your selected halt duration threshold (e.g. &gt;4 hrs) is outlined with an amber warning border and alert badge for quick anomaly detection.
            </p>
          </div>

          {/* Weekends & Calendar */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Day-of-Week & Weekend Differentiation
            </h4>
            <p className="text-sm text-muted-foreground">
              Column headers show day abbreviations (<Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold">Sun</Badge>, <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold">Mon</Badge>). Weekend days (Saturday & Sunday) are subtly shaded to help audit non-working day vehicle usage.
            </p>
          </div>

          {/* View Modes */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-500" />
              View Mode Switcher
            </h4>
            <p className="text-sm text-muted-foreground">
              Toggle between <strong>Combined</strong> (shows both distance and halt duration), <strong>Distance Only</strong>, or <strong>Halt Only</strong> to declutter the table.
            </p>
          </div>

          {/* Interactive Trends */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
              Interactive Vehicle Trend Analytics
            </h4>
            <p className="text-sm text-muted-foreground">
              Click on any vehicle row or the vehicle name to open a full monthly trend analytics modal with interactive charts showing daily distance and halt duration distributions.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyReportHelpDialog;