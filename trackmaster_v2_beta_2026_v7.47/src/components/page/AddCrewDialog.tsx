import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

const addCrewSchema = z.object({
  designation: z.string().min(1, 'Designation is required'),
  employeeType: z.string().min(1, 'Employee type is required'),
  firstName: z.string().min(2, 'First name is required'),
  qualification: z.string().optional(),
  permanentAddress: z.string().optional(),
  permanentState: z.string().optional(),
  correspondenceAddress: z.string().optional(),
  correspondenceState: z.string().optional(),
  hireDate: z.string().optional(),
  role: z.string().optional(),
  mobile: z.string().optional(),
  idProofType: z.string().optional(),
  bloodGroup: z.string().optional(),
  employeePhoto: z.any().optional(),
  employeeCode: z.string().optional(),
  contractDuration: z.number().optional(),
  lastName: z.string().min(2, 'Last name is required'),
  experience: z.string().optional(),
  permanentPostalCode: z.string().optional(),
  permanentCity: z.string().optional(),
  correspondencePostalCode: z.string().optional(),
  correspondenceCity: z.string().optional(),
  ctc: z.string().optional(),
  officePhone: z.string().optional(),
  emergencyContact: z.string().optional(),
  idProofNo: z.string().optional(),
  remarks: z.string().optional(),
});

export type AddCrewFormValues = z.infer<typeof addCrewSchema>;

interface AddCrewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCrew: (data: AddCrewFormValues) => void;
}

const AddCrewDialog = ({ open, onOpenChange, onAddCrew }: AddCrewDialogProps) => {
  const form = useForm<AddCrewFormValues>({
    resolver: zodResolver(addCrewSchema),
    defaultValues: {
      contractDuration: 0,
    },
  });

  const onSubmit = (data: AddCrewFormValues) => {
    onAddCrew(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new crew member.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[70vh] p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 px-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <FormField control={form.control} name="designation" render={({ field }) => (<FormItem><FormLabel>Designation</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Designation" /></SelectTrigger></FormControl><SelectContent><SelectItem value="driver">Driver</SelectItem><SelectItem value="conductor">Conductor</SelectItem><SelectItem value="manager">Manager</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="employeeType" render={({ field }) => (<FormItem><FormLabel>Employee Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Employee Type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="full-time">Full-Time</SelectItem><SelectItem value="part-time">Part-Time</SelectItem><SelectItem value="contract">Contract</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="qualification" render={({ field }) => (<FormItem><FormLabel>Qualification</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="permanentAddress" render={({ field }) => (<FormItem><FormLabel>Permanent Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="permanentState" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger></FormControl><SelectContent><SelectItem value="state1">State 1</SelectItem><SelectItem value="state2">State 2</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="correspondenceAddress" render={({ field }) => (<FormItem><FormLabel>Correspondence Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="correspondenceState" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger></FormControl><SelectContent><SelectItem value="state1">State 1</SelectItem><SelectItem value="state2">State 2</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="hireDate" render={({ field }) => (<FormItem><FormLabel>Hire Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="mobile" render={({ field }) => (<FormItem><FormLabel>Mobile</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="idProofType" render={({ field }) => (<FormItem><FormLabel>ID Proof Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Proof" /></SelectTrigger></FormControl><SelectContent><SelectItem value="aadhar">Aadhar Card</SelectItem><SelectItem value="pan">PAN Card</SelectItem><SelectItem value="license">Driving License</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="bloodGroup" render={({ field }) => (<FormItem><FormLabel>Blood Group</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="employeePhoto" render={({ field }) => (<FormItem><FormLabel>Upload Employee Photo</FormLabel><FormControl><Input type="file" onChange={e => field.onChange(e.target.files)} /></FormControl><FormDescription>Supported filetypes: bmp, jpg, gif, png. Max 100 KB.</FormDescription><FormMessage /></FormItem>)} />
                </div>
                {/* Right Column */}
                <div className="space-y-4">
                  <FormField control={form.control} name="employeeCode" render={({ field }) => (<FormItem><FormLabel>Employee Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="contractDuration" render={({ field }) => (<FormItem><FormLabel>Contract Duration (Months)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="experience" render={({ field }) => (<FormItem><FormLabel>Experience</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="permanentPostalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="permanentCity" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger></FormControl><SelectContent><SelectItem value="city1">City 1</SelectItem><SelectItem value="city2">City 2</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="correspondencePostalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="correspondenceCity" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger></FormControl><SelectContent><SelectItem value="city1">City 1</SelectItem><SelectItem value="city2">City 2</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="ctc" render={({ field }) => (<FormItem><FormLabel>CTC</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="officePhone" render={({ field }) => (<FormItem><FormLabel>Office Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="emergencyContact" render={({ field }) => (<FormItem><FormLabel>Emergency Contact</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="idProofNo" render={({ field }) => (<FormItem><FormLabel>ID Proof No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCrewDialog;