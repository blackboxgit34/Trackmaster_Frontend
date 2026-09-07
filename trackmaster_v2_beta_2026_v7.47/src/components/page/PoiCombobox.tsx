import * as React from 'react';
import { Check, ChevronsUpDown, MapPin, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Command as CommandPrimitive } from 'cmdk';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import type { Poi } from '@/data/poiData';

interface PoiComboboxProps {
  pois: Poi[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  allowAll?: boolean;
  allLabel?: string;
  icon?: React.ReactNode;
}

export function PoiCombobox({
  pois,
  value,
  onChange,
  placeholder,
  className,
  allowAll = true,
  allLabel = 'All Locations',
  icon,
}: PoiComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedPoi = pois.find((poi) => poi.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-start font-normal text-left h-9 text-sm', className)}
        >
          {icon || <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />}
          <span className="flex-1 truncate">
            {selectedPoi ? selectedPoi.poiName : (value === '' || value === 'all' ? (allowAll ? allLabel : placeholder) : placeholder)}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[240px] p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandPrimitive.Input
              placeholder="Search location..."
              className="flex h-10 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Separator orientation="vertical" className="h-5" />
            <Button asChild variant="link" size="sm" className="ml-2 shrink-0 pr-1 text-xs text-primary font-medium">
              <Link to="/geofencing/add-poi">Add POI</Link>
            </Button>
          </div>
          <CommandList className="max-h-[220px]">
            <CommandEmpty>No location found.</CommandEmpty>
            <CommandGroup>
              {allowAll && (
                <CommandItem
                  value={allLabel}
                  onSelect={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="font-medium cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      !value || value === '' || value === 'all' ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {allLabel}
                </CommandItem>
              )}
              {pois.map((poi) => (
                <CommandItem
                  key={poi.id}
                  value={poi.poiName}
                  onSelect={() => {
                    onChange(poi.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === poi.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{poi.poiName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}