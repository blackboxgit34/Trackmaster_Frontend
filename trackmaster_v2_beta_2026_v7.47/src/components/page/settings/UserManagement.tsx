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
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import InviteUserDialog, { type InviteUserFormValues } from './InviteUserDialog';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const initialUsers = [
  { id: 1, name: 'Admin User', email: 'admin@trackmaster.com', role: 'Super Admin', status: 'Active' },
  { id: 2, name: 'Ramesh Kumar', email: 'ramesh.k@example.com', role: 'Admin', status: 'Active' },
  { id: 3, name: 'Sunita Sharma', email: 'sunita.s@example.com', role: 'Engineer', status: 'Invited' },
  { id: 4, name: 'Vijay Singh', email: 'vijay.s@example.com', role: 'Customer', status: 'Inactive' },
];

const UserManagement = () => {
  const [users, setUsers] = useState(initialUsers);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const { toast } = useToast();
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState('');

  const handleInviteUser = (data: InviteUserFormValues) => {
    const newUser = {
      id: users.length + 1,
      name: data.name,
      email: data.email,
      role: data.role,
      status: 'Invited',
    };
    setUsers(prevUsers => [...prevUsers, newUser]);
    toast({
      variant: 'success',
      title: 'Invitation Sent',
      description: `An invitation has been sent to ${data.email}.`,
    });
  };

  const handleEditClick = (user: typeof initialUsers[0]) => {
    setEditingUserId(user.id);
    setEditingRole(user.role);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingRole('');
  };

  const handleSaveRole = (userId: number) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, role: editingRole } : user
      )
    );
    toast({
      variant: 'success',
      title: 'Role Updated',
      description: `The role for ${users.find(u => u.id === userId)?.name} has been updated to ${editingRole}.`,
    });
    handleCancelEdit();
  };

  const handleRemoveUser = (userId: number) => {
    const userToRemove = users.find(u => u.id === userId);
    if (userToRemove?.role === 'Super Admin') {
      toast({
        title: 'Action Forbidden',
        description: 'The Super Admin cannot be removed.',
        variant: 'destructive',
      });
      return;
    }
    setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    toast({
      title: 'User Removed',
      description: `${userToRemove?.name} has been removed from the team.`,
      variant: 'destructive',
    });
  };

  const handleResendInvitation = (email: string) => {
    toast({
      variant: 'success',
      title: 'Invitation Resent',
      description: `A new invitation has been sent to ${email}.`,
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Invite, manage, and remove team members.
            </CardDescription>
          </div>
          <Button onClick={() => setIsInviteDialogOpen(true)}>Invite User</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  {editingUserId === user.id ? (
                    <>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Select value={editingRole} onValueChange={(value) => setEditingRole(value as string)}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Engineer">Engineer</SelectItem>
                            <SelectItem value="Customer">Customer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === 'Active'
                              ? 'success'
                              : user.status === 'Invited'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" onClick={() => handleSaveRole(user.id)}>Save</Button>
                          <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === 'Active'
                              ? 'success'
                              : user.status === 'Invited'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={user.role === 'Super Admin'}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(user)}>Edit Role</DropdownMenuItem>
                            {user.status === 'Invited' && (
                              <DropdownMenuItem onClick={() => handleResendInvitation(user.email)}>
                                Resend Invitation
                              </DropdownMenuItem>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-red-500 focus:text-red-500"
                                >
                                  Remove User
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove {user.name} from your team.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveUser(user.id)}>
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <InviteUserDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        onInviteUser={handleInviteUser}
      />
    </>
  );
};

export default UserManagement;