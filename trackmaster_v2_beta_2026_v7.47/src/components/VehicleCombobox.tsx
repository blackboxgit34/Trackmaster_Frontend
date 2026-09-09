import * as React from 'react';
import { Check, ChevronsUpDown, Car } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';   

interface VehicleComboboxProps {
  // vehicles: { id: string; name: string }[];
    vehicles: { label: string; value: string }[];  // ✅ FIXED
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function VehicleCombobox({
  vehicles,
  value,
  onChange,
  className,
}: VehicleComboboxProps) {
  const [open, setOpen] = React.useState(false);

  // const selectedVehicle = vehicles.find((vehicle) => vehicle.id === value);
const selectedVehicle = vehicles.find(
  (vehicle) => vehicle.value === value
);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-start text-left font-normal', className)}
        >
          <Car className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left truncate">
            {selectedVehicle ? selectedVehicle.label : 'All Vehicles'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search vehicle..." />
          <CommandList>
            <CommandEmpty>No vehicle found.</CommandEmpty>
            <CommandGroup>
              {vehicles.map((vehicle) => (
                <CommandItem
                  key={vehicle.value}
                  value={vehicle.label}
                  onSelect={() => {
                    onChange(vehicle.value);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between text-left cursor-pointer px-2.5 py-1.5"
                >
                  <span className="truncate text-left flex-1">{vehicle.label}</span>
                  <Check
                    className={cn(
                      'ml-2 h-4 w-4 shrink-0',
                      value === vehicle.value
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}