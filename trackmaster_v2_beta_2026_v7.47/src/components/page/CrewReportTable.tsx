import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { crewData, type CrewMember } from '@/data/crewData';
import AddCrewDialog, { type AddCrewFormValues } from './AddCrewDialog';

const CrewReportTable = () => {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>(crewData);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleAddCrew = (data: AddCrewFormValues) => {
    // This is a mock implementation. In a real app, you'd save this to a database.
    const newCrewMember: CrewMember = {
      id: `crew-${Date.now()}`,
      type: data.designation === 'driver' ? 'Driver' : 'Conductor',
      vehicleId: 'N/A',
      vehicleName: 'Unassigned',
      driverName: `${data.firstName} ${data.lastName}`,
      conductorName: null, // Simplified for this example
    };
    setCrewMembers(prev => [...prev, newCrewMember]);
    toast({
      title: 'Crew Member Added',
      description: `${data.firstName} ${data.lastName} has been added.`,
    });
  };

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
                  <TableCell>{member.type}</TableCell>
                  <TableCell>{member.vehicleName}</TableCell>
                  <TableCell>{member.driverName}</TableCell>
                  <TableCell>{member.conductorName || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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