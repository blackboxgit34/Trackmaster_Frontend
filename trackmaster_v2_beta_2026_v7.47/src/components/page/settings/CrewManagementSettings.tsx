import { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlusCircle, Search, MoreHorizontal, User, Phone, ShieldCheck, Truck, Edit, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { crewData, type CrewMember } from '@/data/crewData';
import AddCrewDialog, { type AddCrewFormValues } from '@/components/page/AddCrewDialog';
import { actualVehicles } from '@/data/mockData';

export default function CrewManagementSettings() {
  const [crewList, setCrewList] = useState<CrewMember[]>(crewData);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const { toast } = useToast();

  // Edit Modal state
  const [editingCrew, setEditingCrew] = useState<CrewMember | null>(null);
  const [editForm, setEditForm] = useState({
    driverName: '',
    type: 'Driver' as 'Driver' | 'Conductor',
    mobile: '',
    licenseNo: '',
    status: 'Available' as 'Available' | 'On Duty' | 'On Leave',
    vehicleId: 'N/A',
  });

  const filteredCrew = useMemo(() => {
    return crewList.filter((member) => {
      const matchesSearch =
        member.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.mobile && member.mobile.includes(searchTerm)) ||
        (member.licenseNo && member.licenseNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.vehicleName && member.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = filterType === 'All' || member.type === filterType;
      const matchesStatus = filterStatus === 'All' || (member.status || 'Available') === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [crewList, searchTerm, filterType, filterStatus]);

  // Statistics
  const totalCrew = crewList.length;
  const driversCount = crewList.filter((c) => c.type === 'Driver').length;
  const conductorsCount = crewList.filter((c) => c.type === 'Conductor').length;
  const availableCount = crewList.filter((c) => (c.status || 'Available') === 'Available').length;
  const onDutyCount = crewList.filter((c) => c.status === 'On Duty').length;

  const handleAddCrew = (data: AddCrewFormValues) => {
    const newMember: CrewMember = {
      id: `crew-${Date.now()}`,
      type: data.designation === 'driver' ? 'Driver' : 'Conductor',
      vehicleId: 'N/A',
      vehicleName: 'Unassigned',
      driverName: `${data.firstName} ${data.lastName}`,
      conductorName: null,
      mobile: data.mobile || '+91 98000 00000',
      licenseNo: data.idProofNo || `DL-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      status: 'Available',
      experience: data.experience || '1 Year',
    };

    setCrewList((prev) => [newMember, ...prev]);
    toast({
      title: 'Crew Member Added',
      description: `${newMember.driverName} has been added to crew management.`,
    });
  };

  const handleOpenEdit = (member: CrewMember) => {
    setEditingCrew(member);
    setEditForm({
      driverName: member.driverName,
      type: member.type,
      mobile: member.mobile || '',
      licenseNo: member.licenseNo || '',
      status: member.status || 'Available',
      vehicleId: member.vehicleId || 'N/A',
    });
  };

  const handleSaveEdit = () => {
    if (!editingCrew) return;

    const assignedVeh = actualVehicles.find((v) => v.id === editForm.vehicleId);

    setCrewList((prev) =>
      prev.map((c) =>
        c.id === editingCrew.id
          ? {
              ...c,
              driverName: editForm.driverName,
              type: editForm.type,
              mobile: editForm.mobile,
              licenseNo: editForm.licenseNo,
              status: editForm.status,
              vehicleId: editForm.vehicleId,
              vehicleName: assignedVeh ? assignedVeh.name : editForm.vehicleId === 'N/A' ? 'Unassigned' : c.vehicleName,
            }
          : c
      )
    );

    toast({
      title: 'Crew Member Updated',
      description: `${editForm.driverName}'s details have been updated successfully.`,
    });
    setEditingCrew(null);
  };

  const handleDeleteCrew = (id: string, name: string) => {
    setCrewList((prev) => prev.filter((c) => c.id !== id));
    toast({
      title: 'Crew Member Removed',
      description: `${name} has been removed from the drivers list.`,
      variant: 'destructive',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 shadow-sm bg-card border-border">
          <p className="text-xs text-muted-foreground font-medium">Total Crew</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalCrew}</p>
        </Card>
        <Card className="p-4 shadow-sm bg-card border-border">
          <p className="text-xs text-muted-foreground font-medium">Drivers</p>
          <p className="text-2xl font-bold text-primary mt-1">{driversCount}</p>
        </Card>
        <Card className="p-4 shadow-sm bg-card border-border">
          <p className="text-xs text-muted-foreground font-medium">Conductors</p>
          <p className="text-2xl font-bold text-foreground mt-1">{conductorsCount}</p>
        </Card>
        <Card className="p-4 shadow-sm bg-card border-border">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Available</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{availableCount}</p>
        </Card>
        <Card className="p-4 shadow-sm bg-card border-border col-span-2 md:col-span-1">
          <p className="text-xs text-muted-foreground font-medium">On Duty</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{onDutyCount}</p>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-primary" /> Crew Management
            </CardTitle>
            <CardDescription className="mt-1">
              Manage fleet drivers, conductors, contact numbers, driving licenses, and vehicle assignments.
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" /> Add Crew Member
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, license..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 text-xs w-[130px]">
                  <SelectValue placeholder="Designation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  <SelectItem value="Driver">Drivers</SelectItem>
                  <SelectItem value="Conductor">Conductors</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-xs w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="On Duty">On Duty</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[200px]">Name & Role</TableHead>
                  <TableHead>Contact Mobile</TableHead>
                  <TableHead>Driving License / ID</TableHead>
                  <TableHead>Assigned Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCrew.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      No crew members found matching your search criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCrew.map((member) => {
                    const status = member.status || 'Available';
                    return (
                      <TableRow key={member.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
                              {member.driverName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-foreground">{member.driverName}</div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" /> {member.type}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs">
                          <span className="flex items-center gap-1 text-foreground">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {member.mobile || 'N/A'}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs font-mono">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                            {member.licenseNo || 'N/A'}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs">
                          <span className="flex items-center gap-1 text-foreground">
                            <Truck className="h-3 w-3 text-muted-foreground" />
                            {member.vehicleName && member.vehicleName !== 'Unassigned'
                              ? member.vehicleName
                              : 'Unassigned'}
                          </span>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              status === 'Available'
                                ? 'success'
                                : status === 'On Duty'
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-[11px] font-medium"
                          >
                            {status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => handleOpenEdit(member)}>
                                <Edit className="mr-2 h-3.5 w-3.5" /> Edit Details
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove Driver
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Crew Member?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove <strong>{member.driverName}</strong> from the system?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteCrew(member.id, member.driverName)}>
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Crew Dialog */}
      <AddCrewDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddCrew={handleAddCrew}
      />

      {/* Edit Crew Dialog */}
      {editingCrew && (
        <Dialog open={!!editingCrew} onOpenChange={(open) => !open && setEditingCrew(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Crew Member</DialogTitle>
              <DialogDescription>Update contact information and status for {editingCrew.driverName}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.driverName}
                  onChange={(e) => setEditForm({ ...editForm, driverName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role / Type</Label>
                  <Select
                    value={editForm.type}
                    onValueChange={(val: 'Driver' | 'Conductor') => setEditForm({ ...editForm, type: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Driver">Driver</SelectItem>
                      <SelectItem value="Conductor">Conductor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(val: 'Available' | 'On Duty' | 'On Leave') =>
                      setEditForm({ ...editForm, status: val })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="On Duty">On Duty</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-mobile">Mobile Number</Label>
                <Input
                  id="edit-mobile"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-license">Driving License / ID</Label>
                <Input
                  id="edit-license"
                  value={editForm.licenseNo}
                  onChange={(e) => setEditForm({ ...editForm, licenseNo: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Assigned Vehicle</Label>
                <Select
                  value={editForm.vehicleId}
                  onValueChange={(val) => setEditForm({ ...editForm, vehicleId: val })}
                >
                  <SelectTrigger><SelectValue placeholder="Select Vehicle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N/A">Unassigned</SelectItem>
                    {actualVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCrew(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
