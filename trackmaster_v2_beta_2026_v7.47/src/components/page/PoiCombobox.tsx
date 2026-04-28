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
}

export function PoiCombobox({
  pois,
  value,
  onChange,
  placeholder,
  className,
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
          className={cn('justify-start font-normal', className)}
        >
          <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-left truncate">
            {selectedPoi ? selectedPoi.poiName : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandPrimitive.Input
              placeholder="Search POI..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Separator orientation="vertical" className="h-6" />
            <Button asChild variant="link" className="ml-2 shrink-0 pr-1 text-brand-blue">
              <Link to="/geofencing/add-poi">Add POI</Link>
            </Button>
          </div>
          <CommandList>
            <CommandEmpty>No POI found.</CommandEmpty>
            <CommandGroup>
              {pois.map((poi) => (
                <CommandItem
                  key={poi.id}
                  value={poi.poiName}
                  onSelect={() => {
                    onChange(poi.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === poi.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {poi.poiName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}