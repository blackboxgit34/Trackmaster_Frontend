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
  vehicles: { id: string; name: string }[];
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

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-start font-normal', className)}
        >
          <Car className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-left truncate">
            {selectedVehicle ? selectedVehicle.name : 'All Vehicles'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search vehicle..." />
          <CommandList>
            <CommandEmpty>No vehicle found.</CommandEmpty>
            <CommandGroup>
              {vehicles.map((vehicle) => (
                <CommandItem
                  key={vehicle.id}
                  value={vehicle.name}
                  onSelect={() => {
                    onChange(vehicle.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === vehicle.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {vehicle.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}