import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { VehicleCombobox } from '../VehicleCombobox';
import { vehicles } from '@/data/mockData';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { ChevronLeft, Layers, Sparkles } from 'lucide-react';

export interface SaveTemplateFormData {
  name: string;
  description?: string;
  vehicle?: string;
  dateRange?: DateRange;
}

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: SaveTemplateFormData) => void;
  initialVehicle?: string;
  initialDateRange?: DateRange;
  selectedColumnCount?: number;
  onBack?: () => void;
  isWizard?: boolean;
}

const SaveTemplateDialog = ({
  open,
  onOpenChange,
  onSave,
  initialVehicle = 'all',
  initialDateRange,
  selectedColumnCount,
  onBack,
  isWizard = false,
}: SaveTemplateDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);

  useEffect(() => {
    if (open) {
      setVehicle(initialVehicle || 'all');
      setDateRange(initialDateRange);
    } else {
      setName('');
      setDescription('');
    }
  }, [open, initialVehicle, initialDateRange]);

  const handleSave = () => {
    if (name.trim()) {
      onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        vehicle,
        dateRange,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-orange" />
              {isWizard ? 'Step 2: Template Details' : 'Save Report Template'}
            </DialogTitle>
            {selectedColumnCount != null && (
              <Badge variant="secondary" className="gap-1 font-semibold text-xs">
                <Layers className="h-3 w-3" />
                {selectedColumnCount} Parameters
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs">
            {isWizard
              ? 'Name your new template and configure target vehicles or default date filters.'
              : 'Give your template a name to save the current filter and column configuration.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3 text-sm">
          {/* Template Name */}
          <div className="space-y-1.5">
            <Label htmlFor="template-name" className="font-semibold text-xs flex items-center justify-between">
              <span>Template Name <span className="text-red-500">*</span></span>
            </Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekly Fleet Health & Fuel Audit"
              className="h-9 text-xs"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="template-desc" className="font-semibold text-xs text-muted-foreground">
              Description <span className="text-[10px] font-normal">(Optional)</span>
            </Label>
            <Input
              id="template-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Summary of mileage, fuel consumption, and battery status"
              className="h-9 text-xs"
            />
          </div>

          {/* Target Fleet */}
          <div className="space-y-1.5">
            <Label className="font-semibold text-xs text-muted-foreground">
              Target Vehicle / Fleet
            </Label>
            <VehicleCombobox
              vehicles={vehicles}
              value={vehicle}
              onChange={setVehicle}
              className="w-full"
            />
          </div>

          {/* Default Date Range */}
          <div className="space-y-1.5">
            <Label className="font-semibold text-xs text-muted-foreground">
              Default Date Range <span className="text-[10px] font-normal">(Optional)</span>
            </Label>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between pt-2 border-t">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-xs flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Parameters
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
          )}

          <div className="flex items-center gap-2">
            {onBack && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              onClick={handleSave}
              disabled={!name.trim()}
              className="bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold"
            >
              {isWizard ? 'Create Template' : 'Save Template'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveTemplateDialog;