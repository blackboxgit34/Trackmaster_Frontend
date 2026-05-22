import { useState, useEffect } from 'react';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle,} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {PlusCircle,ChevronUp,ChevronDown,ChevronsUpDown} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CrewMember } from '@/data/crewData';
import AddCrewDialog, { type AddCrewFormValues } from './AddCrewDialog';
import { API_BASE_URL } from '@/config/Api';
import type { DataTableRequestModel } from '@/hooks/DataTableRequestModel';

const CrewReportTable = ({ search }: { search: string }) => {
const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
const { toast } = useToast();
const [loading, setLoading] = useState(false);
const [sortColumn, setSortColumn] = useState<string>('vehicleName');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
const sortMap: any = {
vehicleName: "VehName",
driverName: "DriverName",
conductorName: "ConductorName"
};

const [page, setPage] = useState(0);
const [rowsPerPage, setRowsPerPage] = useState(10);
const [totalRecords, setTotalRecords] = useState(0);

useEffect(() => {
  const maxPage = Math.max(0, Math.ceil(totalRecords / rowsPerPage) - 1);
  if (page > maxPage) {
    setPage(maxPage);
  }
}, [totalRecords, rowsPerPage]);
  const totalPages = Math.ceil(totalRecords / rowsPerPage);
  useEffect(() => {
  setPage(0);
}, [search]);
 
const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: string, isFirst = false) => {
    if (sortColumn === column) {
      return sortDirection === 'asc'
        ? <ChevronUp className="inline ml-1 h-4 w-4 text-black" />
        : <ChevronDown className="inline ml-1 h-4 w-4 text-black" />;
    }
    if (isFirst) {
      return <ChevronUp className="inline ml-1 h-4 w-4 opacity-30" />;
    }
    return <ChevronsUpDown className="inline ml-1 h-4 w-4 opacity-40" />;
  };


 const getVehicleIcon = (vehicleType?: string) => {
  debugger
    const val = (vehicleType || '').toLowerCase();
    console.log("type:", vehicleType);
    if (val.includes("car")) {
        return "/icons/vehicles/car/icon.png";
    }
   if (val.includes("other")) {
        return "/icons/vehicles/truck/icon.png";
    }
    return "/icons/vehicles/car/icon.png";
};

 useEffect(() => {
  const fetchCrew = async () => {
    try {
      setLoading(true);

      const auth = JSON.parse(
        localStorage.getItem("trackmaster-auth") || "{}"
      );

      const requestModel: DataTableRequestModel = {
        CustId: auth.custId,
        sEcho: 1,
        iDisplayStart: page * rowsPerPage,
        iDisplayLength: rowsPerPage,
        sSearch: search?.trim() || "",
        sortColumn: sortMap[sortColumn],
        sortDirection: sortDirection,
      };

      const params = new URLSearchParams();

      Object.entries(requestModel).forEach(([key, value]) => {
        params.append(key, String(value ?? ""));
      });

      const res = await fetch(
        `${API_BASE_URL}/Reports/GetConductorInfo?${params}`
      );

      const data = await res.json();

      setTotalRecords(data.iTotalRecords);

      setCrewMembers(
        (data.aaData || []).map((item: any, index: number) => ({
          id: item.bbid || `crew-${index}`,
          type: getVehicleIcon(item.vehicleType),
          vehicleName: item.vehicleName,
          driverName:
            item.driverName === "No Driver Assigned"
              ? null
              : item.driverName,
          conductorName: item.conductor,
        }))
      );
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to load data",
      });
    } finally {
      setLoading(false);
    }
  };

  fetchCrew();
}, [page, rowsPerPage, search, sortColumn, sortDirection]);



  const handleAddCrew = (data: AddCrewFormValues) => {
    const newCrew: CrewMember = {
      id: `crew-${Date.now()}`,
      type: "/icons/vehicles/truck/icon.png",
      vehicleName: "Unassigned",
      driverName: `${data.firstName} ${data.lastName}`,
      conductorName: null
    };
    setCrewMembers(prev => [...prev, newCrew]);
  };
const Pagination = () => {
const start = page * rowsPerPage + 1;
const end = Math.min((page + 1) * rowsPerPage, totalRecords);
return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <div className="flex items-center gap-2">
        Rows per page:
        <select
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(0);
          }}
          className="border px-2 py-1 rounded"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
        </select>
      </div>
      <div className="flex items-center gap-4">
        <span>
          {start}-{end} of {totalRecords}
        </span>
        <div className="flex items-center gap-3 text-lg">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 0))}
            disabled={page === 0}
            className="disabled:opacity-40"
          >
            &lt;
          </button>
          <button
            onClick={() =>
              setPage(p => Math.min(p + 1, totalPages - 1))
            }
            disabled={page >= totalPages - 1}
            className="disabled:opacity-40"
          >
            &gt;
          </button>

        </div>
      </div>
    </div>
  );
};
  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">

          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" />

          {/* loader */}
          <div className="relative bg-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-scaleIn">
            <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full" />
            <span className="text-sm font-medium">Please wait...</span>
          </div>

        </div>
      )}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Crew Report</CardTitle>
            <CardDescription>Manage fleet crew</CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Crew
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead onClick={() => handleSort('vehicleName')} className="cursor-pointer">
                  Vehicle No {renderSortIcon('vehicleName', true)}
                </TableHead>
                <TableHead onClick={() => handleSort('driverName')} className="cursor-pointer">
                  Driver Name {renderSortIcon('driverName')}
                </TableHead>
                <TableHead onClick={() => handleSort('conductorName')} className="cursor-pointer">
                  Conductor Name {renderSortIcon('conductorName')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crewMembers.map(m => (
                <TableRow key={m.id}>
                  <TableCell>
                    <img src={m.type} className="w-10 h-10" />
                  </TableCell>
                  <TableCell>{m.vehicleName}</TableCell>
                  <TableCell>{m.driverName || 'No Driver Assigned'}</TableCell>
                  <TableCell>{m.conductorName || 'No Conductor Assigned'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination />
        </CardContent>
      </Card>
      <AddCrewDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddCrew={handleAddCrew}
      />
    </>
  );
};

export default CrewReportTable;