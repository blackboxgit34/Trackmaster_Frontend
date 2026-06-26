import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import WhatsappPopup from '../../WhatsappPopup';
import { VehicleCombobox } from '../../VehicleCombobox';
import { API_BASE_URL } from '@/config/Api';
import { useSearchParams } from 'react-router-dom';
import { DateRangePicker } from '@/components/ui/date-range-picker';

interface DistanceReportToolbarProps {
  dateRange: DateRange | undefined;
  setDateRange: (date: DateRange | undefined) => void;
  selectedVehicle: string;
  setSelectedVehicle: (vehicle: string) => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
}

const DistanceReportToolbar = ({
  dateRange,
  setDateRange,
  selectedVehicle,
  setSelectedVehicle,
  onExportPDF,
  onExportCSV,
}: DistanceReportToolbarProps) => {
  const [vehicles, setVehicles] = useState<{ label: string; value: string }[]>([]);
  const [searchParams] = useSearchParams();
  const vehicleFromUrl = searchParams.get('vehicle');

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const auth = JSON.parse(localStorage.getItem('trackmaster-auth') || '{}');
        const custId = auth.custId;

        const response = await fetch(
          `${API_BASE_URL}/Dashboard/GetAllVehicleListByCustId?userid=${custId}`
        );
        const data = await response.json();

        const formattedVehicles = [
          { label: 'All Vehicles', value: '' },
          ...(data.data || []).map((v: any) => ({
            label: v.vehName,
            value: v.bbid,
          })),
        ];

        setVehicles(formattedVehicles);

        if (formattedVehicles.length > 0) {
          if (vehicleFromUrl) {
            setSelectedVehicle(vehicleFromUrl);
          } else if (!selectedVehicle) {
            setSelectedVehicle(formattedVehicles[0].value);
          }
        }
      } catch (error) {
        console.error('Vehicle API Error', error);
      }
    };

    loadVehicles();
  }, []);

  return (
    <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
      <DateRangePicker date={dateRange} setDate={setDateRange} />
      <VehicleCombobox
        vehicles={vehicles}
        value={selectedVehicle}
        onChange={setSelectedVehicle}
        className="w-full sm:w-[180px]"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onExportPDF}>
            <FileText className="mr-2 h-4 w-4" />Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onExportCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />Export as CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <WhatsappPopup />
    </div>
  );
};

export default DistanceReportToolbar;
