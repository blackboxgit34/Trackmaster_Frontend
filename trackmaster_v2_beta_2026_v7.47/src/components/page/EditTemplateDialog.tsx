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
import { VehicleCombobox } from '../VehicleCombobox';
import { vehicles } from '@/data/mockData';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Settings2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { ALL_COLUMNS } from './CustomReport';
import type { ReportTemplate } from './CustomReport';

interface EditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ReportTemplate | null;
  onSave: (updatedTemplate: ReportTemplate) => void;
}

const EditTemplateDialog = ({ open, onOpenChange, template, onSave }: EditTemplateDialogProps) => {
  const [name, setName] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [tempSelectedColumns, setTempSelectedColumns] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (template) {
      setName(template.name);
      setSelectedColumns(new Set(template.columns));
      setSelectedVehicle(template.vehicle);
      setDateRange(template.dateRange);
    }
  }, [template]);

  const handleSave = () => {
    if (!template || !name.trim()) return;
    onSave({
      ...template,
      name: name.trim(),
      columns: selectedColumns,
      vehicle: selectedVehicle,
      dateRange: dateRange,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Report Template</DialogTitle>
          <DialogDescription>
            Update the details for your "{template?.name}" template.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Vehicle</Label>
            <VehicleCombobox vehicles={vehicles} value={selectedVehicle} onChange={setSelectedVehicle} />
          </div>
          <div className="space-y-2">
            <Label>Date Range</Label>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
          </div>
          <div className="space-y-2">
            <Label>Columns</Label>
            <DropdownMenu open={isColumnSelectorOpen} onOpenChange={(open) => {
              if (open) {
                setTempSelectedColumns(new Set(selectedColumns));
              }
              setIsColumnSelectorOpen(open);
            }}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Select Columns ({selectedColumns.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Report Parameters</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_COLUMNS.map(col => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={tempSelectedColumns.has(col.key)}
                    onCheckedChange={(checked) => {
                      setTempSelectedColumns(prev => {
                        const newSet = new Set(prev);
                        if (checked) newSet.add(col.key);
                        else newSet.delete(col.key);
                        return newSet;
                      });
                    }}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <div className="p-2 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsColumnSelectorOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={() => {
                    setSelectedColumns(tempSelectedColumns);
                    setIsColumnSelectorOpen(false);
                  }}>Apply</Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSave} disabled={!name.trim()}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTemplateDialog;