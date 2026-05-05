import { useState, useEffect } from 'react';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '@/components/ui/table';
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CrewMember } from '@/data/crewData';
import AddCrewDialog, { type AddCrewFormValues } from './AddCrewDialog';

// =========================
// RECEIVE SEARCH FROM PARENT
// =========================
const CrewReportTable = ({ search }: { search: string }) => {
const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
const { toast } = useToast();

// =========================
// PAGINATION STATE
// =========================
const [page, setPage] = useState(0);
const [rowsPerPage, setRowsPerPage] = useState(10);
const [totalRecords, setTotalRecords] = useState(0);
const totalPages = Math.ceil(totalRecords / rowsPerPage);

// =========================
// ✅ FIX: RESET PAGE ON SEARCH
// =========================
useEffect(() => {setPage(0);}, [search]);

// =========================
// ICON MAPPING
// =========================
const getVehicleIcon = (apiPath: string) => {
if (!apiPath) return "/icons/vehicles/truck/icon.png";
const name = apiPath.toLowerCase();
if (name.includes("car")) return "/icons/vehicles/car/icon.png";
if (name.includes("truck")) return "/icons/vehicles/truck/icon.png";
return "/icons/vehicles/truck/icon.png";};

// =========================
// API CALL
// =========================
useEffect(() => {
const fetchCrew = async () => {
      try {
        const params = new URLSearchParams({
          CustId: '45',
          sEcho: '1',
          iDisplayStart: String(page * rowsPerPage),
          iDisplayLength: String(rowsPerPage),
          // ✅ FIX: no "null"
          // sSearch: search && search.trim() !== '' ? search : 'null'
          sSearch: search && search.trim() !== '' ? search : 'null'
        });
        const url = `https://localhost:7182/api/Reports?${params.toString()}`;
        const res = await fetch(url);
        console.log('Fetching crew with URL:', url);
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();
        setTotalRecords(data.iTotalRecords);
        // ✅ FIX: safe mapping
        const mapped: CrewMember[] = (data.aaData || []).map((item: any, index: number) => ({
          id: item.bbid || `crew-${index}`,
          type: getVehicleIcon(item.vehicleImagePath),
          vehicleName: item.vehicleName,
          driverName:item.driverName === 'No Driver Assigned'? null: item.driverName,
          conductorName: item.conductorName,
        }));
        setCrewMembers(mapped);
      } catch (error) {
        console.error('Error fetching crew:', error);
        toast({
          title: 'Error',
          description: 'Failed to load crew data',
        });
      }
    };
    fetchCrew();
  }, [page, rowsPerPage, search]);

  // =========================
  // ADD CREW
  // =========================
  const handleAddCrew = (data: AddCrewFormValues) => {
    const newCrewMember: CrewMember = {
      id: `crew-${Date.now()}`,
      type: "/icons/vehicles/truck/icon.png",
      vehicleId: 'N/A',
      vehicleName: 'Unassigned',
      driverName: `${data.firstName} ${data.lastName}`,
      conductorName: null,
    };
    setCrewMembers((prev) => [...prev, newCrewMember]);
    toast({
      title: 'Crew Member Added',
      description: `${data.firstName} ${data.lastName} has been added.`,
    });
  };
  // =========================
  // UI
  // =========================
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Crew Report</CardTitle>
            <CardDescription>
              Manage drivers and conductors for your fleet.
            </CardDescription>
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
                <TableHead>Vehicle No</TableHead>
                <TableHead>Driver Name</TableHead>
                <TableHead>Conductor Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crewMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <img
                      src={member.type}
                      alt="vehicle"
                      style={{ width: 40, height: 40 }}
                    />
                  </TableCell>
                  <TableCell>{member.vehicleName}</TableCell>
                  {/* ✅ FIX: fallback */}
                  <TableCell>{member.driverName || 'No Driver Assigned'}</TableCell>
                  <TableCell>{member.conductorName || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* PAGINATION */}
          <div className="flex items-center justify-between mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select value={rowsPerPage} onChange={(e) => {setRowsPerPage(Number(e.target.value));setPage(0);}}
                className="border rounded px-2 py-1">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span>
                {totalRecords === 0? '0-0 of 0': `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage,totalRecords)} of ${totalRecords}`}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setPage(0)} disabled={page === 0}> ⏮
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>‹</Button>
                <Button variant="ghost" size="icon" onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))} disabled={page >= totalPages - 1}> ›
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>  ⏭
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <AddCrewDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onAddCrew={handleAddCrew}
      />
    </>
  );
};

export default CrewReportTable;