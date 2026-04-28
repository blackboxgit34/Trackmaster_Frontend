import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';

interface MonthlyReportHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HelpItem = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h4 className="font-semibold text-foreground">{title}</h4>
    <p className="text-sm text-muted-foreground mt-1">{children}</p>
  </div>
);

const MonthlyReportHelpDialog = ({ open, onOpenChange }: MonthlyReportHelpDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            How to Read the Report
          </DialogTitle>
          <DialogDescription>
            A guide to understanding the monthly day-wise distance report.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <HelpItem title="Heatmap Colors">
            Each cell's color represents the distance traveled on that day. Darker blue cells indicate more distance, while lighter cells indicate less.
          </HelpItem>
          <HelpItem title="Stoppage Time">
            The stoppage duration in hours is displayed below the distance in each cell for that day.
          </HelpItem>
          <HelpItem title="Highlighting Problems">
            Use the "Highlight High Stoppage" switch to draw a red ring around days where a vehicle was stopped for more than 4 hours.
          </HelpItem>
          <HelpItem title="Interaction">
            Hover over any day's cell to see a tooltip with the exact distance and stoppage duration. Hover over a vehicle's name to see a summary of its monthly performance.
          </HelpItem>
          <HelpItem title="Sorting">
            Click on the column headers ('Vehicle No', 'Total Distance', 'Total Stoppage') to sort the data in ascending or descending order.
          </HelpItem>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyReportHelpDialog;