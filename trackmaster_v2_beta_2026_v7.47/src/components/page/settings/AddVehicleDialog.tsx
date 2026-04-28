import { useEffect } from 'react';
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
import { VEHICLE_TYPES } from '@/data/mockData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const addVehicleSchema = z.object({
  // Vehicle Identification
  vehicleName: z.string().min(2, { message: 'Vehicle name is required.' }),
  vehicleType: z.string().min(1, { message: 'Vehicle type is required.' }),
  vehicleRegNo: z.string().min(3, { message: 'Vehicle Reg. No. is required.' }),
  make: z.string().optional(),
  model: z.string().min(1, { message: 'Model is required.' }),
  color: z.string().optional(),
  manufactureDate: z.string().optional(),
  registrationDate: z.string().optional(),
  pucExpiryDate: z.string().optional(),
  costPerKm: z.string().optional(),
  driver: z.string().optional(),
  isActive: z.boolean().default(true),
  chassisNo: z.string().optional(),
  engineNo: z.string().optional(),
  price: z.string().optional(),
  purchaseType: z.string().optional(),
  purchaseDate: z.string().optional(),
  fuelType: z.string().optional(),
  fuelTankCapacity: z.string().optional(),
  rcRenewalDate: z.string().optional(),
  vehicleOdometer: z.string().optional(),
  vehicleStatus: z.string().optional(),
  remarks: z.string().optional(),
  vehicleImage: z.any().optional(),

  // Insurance
  insuranceCo: z.string().optional(),
  policyNo: z.string().optional(),
  insuranceDate: z.string().optional(),
  insuranceExpiryDate: z.string().optional(),
  premiumAmount: z.string().optional(),

  // Vehicle Fitness
  fitnessCertificateNo: z.string().optional(),
  fitnessCertificateDate: z.string().optional(),
  fitnessCertificateExpiryDate: z.string().optional(),

  // Tax Due Date Alert
  goodsTaxAmount: z.string().optional(),
  goodsTaxDepositDate: z.string().optional(),
  goodsTaxExpiryDate: z.string().optional(),
  nationalPermitAmount: z.string().optional(),
  nationalPermitDepositDate: z.string().optional(),
  nationalPermitExpiryDate: z.string().optional(),
  statePermitAmount: z.string().optional(),
  statePermitDepositDate: z.string().optional(),
  statePermitExpiryDate: z.string().optional(),
  tokenTaxAmount: z.string().optional(),
  tokenTaxDepositDate: z.string().optional(),
  tokenTaxExpiryDate: z.string().optional(),

  // Tyre Management
  tyreSrNo: z.string().optional(),
  supplierName: z.string().optional(),
  warranty: z.string().optional(),
  tyrePosition: z.string().optional(),
  fittingDate: z.string().optional(),
  unitPrice: z.string().optional(),
  manufacturer: z.string().optional(),
  tyreDisposalAfter: z.string().optional(),
  odometerReading: z.string().optional(),
  tyrePurchaseDate: z.string().optional(),
  tyreType: z.string().optional(),
});

export type AddVehicleFormValues = z.infer<typeof addVehicleSchema>;

interface AddVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AddVehicleFormValues) => void;
  vehicleToEdit?: Partial<AddVehicleFormValues> | null;
}

const vehicleTypes = Object.keys(VEHICLE_TYPES);

const AddVehicleDialog = ({ open, onOpenChange, onSave, vehicleToEdit }: AddVehicleDialogProps) => {
  const isEditMode = !!vehicleToEdit;

  const form = useForm<AddVehicleFormValues>({
    resolver: zodResolver(addVehicleSchema),
    defaultValues: {
      vehicleName: '', vehicleType: '', vehicleRegNo: '', make: '', model: '', color: '',
      manufactureDate: '', registrationDate: '', pucExpiryDate: '', costPerKm: '', driver: '',
      isActive: true, chassisNo: '', engineNo: '', price: '', purchaseType: '', purchaseDate: '',
      fuelType: '', fuelTankCapacity: '', rcRenewalDate: '', vehicleOdometer: '', vehicleStatus: '',
      remarks: '', insuranceCo: '', policyNo: '', insuranceDate: '', insuranceExpiryDate: '',
      premiumAmount: '', fitnessCertificateNo: '', fitnessCertificateDate: '', fitnessCertificateExpiryDate: '',
      goodsTaxAmount: '', goodsTaxDepositDate: '', goodsTaxExpiryDate: '', nationalPermitAmount: '',
      nationalPermitDepositDate: '', nationalPermitExpiryDate: '', statePermitAmount: '',
      statePermitDepositDate: '', statePermitExpiryDate: '', tokenTaxAmount: '', tokenTaxDepositDate: '',
      tokenTaxExpiryDate: '', tyreSrNo: '', supplierName: '', warranty: '', tyrePosition: '',
      fittingDate: '', unitPrice: '', manufacturer: '', tyreDisposalAfter: '', odometerReading: '',
      tyrePurchaseDate: '', tyreType: '',
    },
  });

  const selectedType = form.watch('vehicleType');

  useEffect(() => {
    if (vehicleToEdit) {
      form.reset(vehicleToEdit);
    } else {
      form.reset();
    }
  }, [vehicleToEdit, form, open]);

  const onSubmit = (data: AddVehicleFormValues) => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this vehicle.' : 'Enter the details for the new vehicle.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[70vh] p-1">
              <div className="px-4 space-y-6">
                <Card>
                  <CardHeader><CardTitle>Vehicle Identification</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="vehicleName" render={({ field }) => (<FormItem><FormLabel>Vehicle Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="vehicleRegNo" render={({ field }) => (<FormItem><FormLabel>Vehicle Reg. No.</FormLabel><FormControl><Input {...field} disabled={isEditMode} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="vehicleType" render={({ field }) => (<FormItem><FormLabel>Vehicle Type</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue('model', ''); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Vehicle Type" /></SelectTrigger></FormControl><SelectContent>{vehicleTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedType}><FormControl><SelectTrigger><SelectValue placeholder="Select a model" /></SelectTrigger></FormControl><SelectContent>{selectedType && VEHICLE_TYPES[selectedType as keyof typeof VEHICLE_TYPES]?.models.map(model => (<SelectItem key={model} value={model}>{model}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="make" render={({ field }) => (<FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="color" render={({ field }) => (<FormItem><FormLabel>Color</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="chassisNo" render={({ field }) => (<FormItem><FormLabel>Chassis No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="engineNo" render={({ field }) => (<FormItem><FormLabel>Engine No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="manufactureDate" render={({ field }) => (<FormItem><FormLabel>Manufacture Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="registrationDate" render={({ field }) => (<FormItem><FormLabel>Registration Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="rcRenewalDate" render={({ field }) => (<FormItem><FormLabel>RC Renewal Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="pucExpiryDate" render={({ field }) => (<FormItem><FormLabel>PUC Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Purchase & Status</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="purchaseType" render={({ field }) => (<FormItem><FormLabel>Purchase Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Purchase Type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="New">New</SelectItem><SelectItem value="Used">Used</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="purchaseDate" render={({ field }) => (<FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="vehicleOdometer" render={({ field }) => (<FormItem><FormLabel>Vehicle Odometer</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="costPerKm" render={({ field }) => (<FormItem><FormLabel>Cost Per Km</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="driver" render={({ field }) => (<FormItem><FormLabel>Driver</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="fuelType" render={({ field }) => (<FormItem><FormLabel>Fuel Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Fuel Type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Diesel">Diesel</SelectItem><SelectItem value="Petrol">Petrol</SelectItem><SelectItem value="Electric">Electric</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="fuelTankCapacity" render={({ field }) => (<FormItem><FormLabel>Fuel Tank Capacity (L)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="vehicleStatus" render={({ field }) => (<FormItem><FormLabel>Vehicle Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem><SelectItem value="In Workshop">In Workshop</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="isActive" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 col-span-1 md:col-span-3"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Is Active</FormLabel><FormDescription>Uncheck this to temporarily disable the vehicle.</FormDescription></div></FormItem>)} />
                    <FormField control={form.control} name="remarks" render={({ field }) => (<FormItem className="col-span-1 md:col-span-3"><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="vehicleImage" render={({ field }) => (<FormItem className="col-span-1 md:col-span-3"><FormLabel>Vehicle Image</FormLabel><FormControl><Input type="file" onChange={e => field.onChange(e.target.files)} /></FormControl><FormDescription>Max 100 KB. Supported types: bmp, jpg, gif, png.</FormDescription><FormMessage /></FormItem>)} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Insurance & Fitness</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="insuranceCo" render={({ field }) => (<FormItem><FormLabel>Insurance Co.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="policyNo" render={({ field }) => (<FormItem><FormLabel>Policy No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="premiumAmount" render={({ field }) => (<FormItem><FormLabel>Premium Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="insuranceDate" render={({ field }) => (<FormItem><FormLabel>Insurance Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="insuranceExpiryDate" render={({ field }) => (<FormItem><FormLabel>Insurance Expiry</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="fitnessCertificateNo" render={({ field }) => (<FormItem><FormLabel>Fitness Cert. No</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="fitnessCertificateDate" render={({ field }) => (<FormItem><FormLabel>Fitness Cert. Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="fitnessCertificateExpiryDate" render={({ field }) => (<FormItem><FormLabel>Fitness Cert. Expiry</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Tax Due Dates</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 border rounded-md space-y-4">
                      <h4 className="font-medium">Goods Tax</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="goodsTaxAmount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="goodsTaxDepositDate" render={({ field }) => (<FormItem><FormLabel>Deposit Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="goodsTaxExpiryDate" render={({ field }) => (<FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                    </div>
                    <div className="p-4 border rounded-md space-y-4">
                      <h4 className="font-medium">National Permit</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="nationalPermitAmount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="nationalPermitDepositDate" render={({ field }) => (<FormItem><FormLabel>Deposit Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="nationalPermitExpiryDate" render={({ field }) => (<FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                    </div>
                    <div className="p-4 border rounded-md space-y-4">
                      <h4 className="font-medium">State Permit</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="statePermitAmount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="statePermitDepositDate" render={({ field }) => (<FormItem><FormLabel>Deposit Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="statePermitExpiryDate" render={({ field }) => (<FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                    </div>
                    <div className="p-4 border rounded-md space-y-4">
                      <h4 className="font-medium">Token Tax</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="tokenTaxAmount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="tokenTaxDepositDate" render={({ field }) => (<FormItem><FormLabel>Deposit Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="tokenTaxExpiryDate" render={({ field }) => (<FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Tyre Management</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name="tyreSrNo" render={({ field }) => (<FormItem><FormLabel>Tyre Sr. No</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tyreType" render={({ field }) => (<FormItem><FormLabel>Tyre Type</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tyrePosition" render={({ field }) => (<FormItem><FormLabel>Tyre Position</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Position" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Front Left">Front Left</SelectItem><SelectItem value="Front Right">Front Right</SelectItem><SelectItem value="Rear Left">Rear Left</SelectItem><SelectItem value="Rear Right">Rear Right</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="supplierName" render={({ field }) => (<FormItem><FormLabel>Supplier Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tyrePurchaseDate" render={({ field }) => (<FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>Unit Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="warranty" render={({ field }) => (<FormItem><FormLabel>Warranty</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="fittingDate" render={({ field }) => (<FormItem><FormLabel>Fitting Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="odometerReading" render={({ field }) => (<FormItem><FormLabel>Odometer at Fitting</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tyreDisposalAfter" render={({ field }) => (<FormItem><FormLabel>Disposal After (Km)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{isEditMode ? 'Save Changes' : 'Add Vehicle'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddVehicleDialog;