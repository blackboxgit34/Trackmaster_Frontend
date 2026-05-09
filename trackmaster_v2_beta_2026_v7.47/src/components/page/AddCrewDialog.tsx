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
import { useState, useEffect } from 'react'; // ✅ ADDED // neha k
import { API_BASE_URL } from '@/config/Api'; // neha k

const addCrewSchema = z.object({
  designation: z.string().min(1, 'Designation is required'),

  employeeType: z.string().min(1, 'Employee type is required'),

  employeeTypeId: z.string().optional(),

  employeeID: z.string().optional(),

  firstName: z.string().min(2, 'First name is required'),

  lastName: z.string().min(2, 'Last name is required'),

  qualification: z.string().optional(),

  permanentAddress: z.string().optional(),

  permanentState: z.string().optional(),

  permanentCity: z.string().optional(),

  permanentPostalCode: z.string().optional(),

  correspondenceAddress: z.string().optional(),

  correspondenceState: z.string().optional(),

  correspondenceCity: z.string().optional(),

  correspondencePostalCode: z.string().optional(),

  hireDate: z.string().optional(),

  role: z.string().optional(),

  mobile: z.string().optional(),

  officePhone: z.string().optional(),

  emergencyContact: z.string().optional(),

  idProofType: z.string().optional(),

  idProofNo: z.string().optional(),

  bloodGroup: z.string().optional(),

  employeePhoto: z.any().optional(),

  employeeCode: z.string().optional(),

  // IMPORTANT → use string instead of number
  contractDuration: z.union([z.string(), z.number()]).optional(),

  experience: z.string().optional(),

  ctc: z.string().optional(),

  remarks: z.string().optional(),

  // ADD THESE MISSING FIELDS
  status: z.string().optional(),

  etmNo: z.string().optional(),

  imagePath: z.string().optional(),

  imageFileName: z.string().optional(),

  drivingLicenseNo: z.string().optional(),

  licenseExpiryDate: z.string().optional(),

  driverCertifications: z.string().optional(),

  technicianCertifications: z.string().optional(),

  attachmentsPath: z.string().optional(),

  attachmentsFileName: z.string().optional(),

  roleResponisbility: z.string().optional(),
  idProof: z.string().optional(),
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


  // =========================
  // ✅ ADDED: API STATE FOR DESIGNATION neha k
  // =========================
  const [designations, setDesignations] = useState<any[]>([]);
   const [crewStates, setcrewStates] = useState<any[]>([]);

      // separate city lists
  const [permanentCities, setPermanentCities] = useState<any[]>([]);
  const [correspondenceCities, setCorrespondenceCities] = useState<any[]>([]);

  // =========================
  // ✅ ADDED: FETCH DESIGNATIONS FROM API neha k
  // =========================
  useEffect(() => {
    const fetchDesignations = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/Reports/GetDesignationTypeCrew`
        );
        const data = await res.json();

        setDesignations(data.aaData || []);
      } catch (err) {
        console.error("Failed to load designations", err);
      }
    };

    if (open) {
      fetchDesignations();
    }
  }, [open]);



   useEffect(() => {
    const fetchCrewStates = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/Reports/GetStatesList`
        );
        const data = await res.json();

        setcrewStates(data.aaData || []);
      } catch (err) {
        console.error("Failed to load designations", err);
      }
    };

    if (open) {
      fetchCrewStates();
    }
  }, [open]);

 // =========================
  // FETCH CITY BY STATE
  // =========================
  const fetchCitiesByState = async (
  stateId: string,
  type: 'permanent' | 'correspondence'
) => {
  try {

    // ✅ FIXED PARAMETER NAME
    const res = await fetch(
      `${API_BASE_URL}/Reports/GetCityList?stateid=${stateId}`
    );

    const data = await res.json();

    console.log("CITY API RESPONSE", data);

    if (type === 'permanent') {
      setPermanentCities(data.cityData || []);
    } else {
      setCorrespondenceCities(data.cityData || []);
    }

  } catch (err) {
    console.error('Failed to load cities', err);
  }
};


  // const onSubmit = (data: AddCrewFormValues) => {
  //   onAddCrew(data);
  //   form.reset();
  //   onOpenChange(false);
  // };



  

const onSubmit = async (data: AddCrewFormValues) => {
  try {
    // =========================
    // PREPARE PAYLOAD
    // =========================


// Correspondence State Name
const selectedCorrespondenceState = crewStates.find(
  (item) =>
    item.value.toString() === data.correspondenceState
);

// Correspondence City Name
const selectedCorrespondenceCity =
  correspondenceCities.find(
    (item) =>
      item.value.toString() ===
      data.correspondenceCity
  );

// Permanent State Name
const selectedPermanentState = crewStates.find(
  (item) =>
    item.value.toString() === data.permanentState
);

// Permanent City Name
const selectedPermanentCity = permanentCities.find(
  (item) =>
    item.value.toString() === data.permanentCity
);



    const payload = {
  employeeID: data.employeeID || "",

  custid: 45,

  employeeCode: data.employeeCode || "",

  firstName: data.firstName || "",

  lastName: data.lastName || "",

  employeeType: data.employeeType || "",

  // FIXED HERE
  employeeTypeId: data.employeeTypeId || "",

  permanentAddress: data.permanentAddress || "",

  permanentPostalCode: data.permanentPostalCode || "",

  permanentState:selectedPermanentState?.name || "",

permanentCity:selectedPermanentCity?.name || "",


  address: data.correspondenceAddress || "",

  postalCode: data.correspondencePostalCode || "",

  state:selectedCorrespondenceState?.name || "",

  city:selectedCorrespondenceCity?.name || "",
  mobile: data.mobile || "",

  bloodGroup: data.bloodGroup || "",

  status: data.status || "",

  hireDate: data.hireDate || "",

  employeeCTC: Number(data.ctc) || 0,

  qualification: data.qualification || "",

  experience: data.experience || "",

  emergencyContactInfo: data.emergencyContact || "",

  etmNo: data.etmNo || "",

  contractDuration: Number(data.contractDuration) || 0,

  officePhone: data.officePhone || "",

  imagePath: data.imagePath || "",

  imageFileName: data.imageFileName || "",

  drivingLicenseNo: data.drivingLicenseNo || "",

  licenseExpiryDate: data.licenseExpiryDate || "",

  driverCertifications: data.driverCertifications || "",

  remarks: data.remarks || "",

  technicianCertifications:
    data.technicianCertifications || "",

  attachmentsPath: data.attachmentsPath || "",

  attachmentsFileName: data.attachmentsFileName || "",

  idProof: data.idProof || "",

  roleResponisbility: data.roleResponisbility || "",
};

    console.log("PAYLOAD:", payload);

    // =========================
    // API CALL
    // =========================
    const response = await fetch(
      `${API_BASE_URL}/Reports/AddUpdateEmployee`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.text();

    console.log("API RESPONSE:", result);

    // =========================
    // SUCCESS
    // =========================
    if (response.ok) {
      alert(result || "Employee saved successfully");

      // =========================
      // RESET FORM
      // =========================
      form.reset({
        employeeID: "",
        employeeCode: "",
        firstName: "",
        lastName: "",
        employeeType: "",
        employeeTypeId: "",
        qualification: "",
        experience: "",
        contractDuration: 0,
        permanentAddress: "",
        permanentPostalCode: "",
        permanentState: "",
        permanentCity: "",
        correspondenceAddress: "",
        correspondencePostalCode: "",
        correspondenceState: "",
        correspondenceCity: "",
        mobile: "",
        officePhone: "",
        emergencyContact: "",
        bloodGroup: "",
        status: "",
        hireDate: "",
        ctc: "",
        etmNo: "",
        imagePath: "",
        imageFileName: "",
        drivingLicenseNo: "",
        licenseExpiryDate: "",
        driverCertifications: "",
        technicianCertifications: "",
        attachmentsPath: "",
        attachmentsFileName: "",
        idProof: "",
        roleResponisbility: "",
        remarks: "",
      });

      // =========================
      // CLEAR FILE INPUT
      // =========================
      const fileInputs =
        document.querySelectorAll<HTMLInputElement>(
          'input[type="file"]'
        );

      fileInputs.forEach((input) => {
        input.value = "";
      });

      // =========================
      // CLOSE DIALOG
      // =========================
      onOpenChange(false);
    } else {
      alert(result || "Failed to save employee");
    }
  } catch (error) {
    console.error("API ERROR:", error);
    alert("Something went wrong");
  }
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


                  {/* =========================
                      DESIGNATION DROPDOWN (UPDATED) neha k
                      ========================= */}
                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation</FormLabel>

                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Designation" />
                            </SelectTrigger>
                          </FormControl>

                          {/* ✅ CHANGED: STATIC → DYNAMIC */}
                          <SelectContent>
                            {designations.map((item) => (
                              <SelectItem
                                key={item.value}
                                value={item.value.toString()}
                              >
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>

                        </Select>

                        <FormMessage />
                      </FormItem>
                          )}
                  />



                  {/* <FormField control={form.control} name="designation" render={({ field }) => (<FormItem><FormLabel>Designation</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Designation" /></SelectTrigger></FormControl><SelectContent><SelectItem value="driver">Driver</SelectItem><SelectItem value="conductor">Conductor</SelectItem><SelectItem value="manager">Manager</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} /> */}
                  <FormField control={form.control} name="employeeType" render={({ field }) => (<FormItem><FormLabel>Employee Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Employee Type" />
                  </SelectTrigger></FormControl>
                  <SelectContent>
                  <SelectItem value="Contract-Based">Contract Based</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                  </SelectContent></Select><FormMessage />
                  </FormItem>)} />
                  <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="qualification" render={({ field }) => (<FormItem><FormLabel>Qualification</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="permanentAddress" render={({ field }) => (<FormItem><FormLabel>Permanent Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                  {/* <FormField control={form.control} name="permanentState" render={({ field }) => (<FormItem>
                    <FormLabel>State</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select State" />
                      </SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="state1">State 1</SelectItem>
                  <SelectItem value="state2">State 2</SelectItem></SelectContent>
                  </Select><FormMessage /></FormItem>)} /> */}

 {/* PERMANENT STATE */}
                  <FormField
                    control={form.control}
                    name="permanentState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>

                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);

                            // reset city
                            form.setValue('permanentCity', '');

                            // fetch city list
                            fetchCitiesByState(value, 'permanent');
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select State" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {crewStates.map((item) => (
                              <SelectItem
                                key={item.value}
                                value={item.value.toString()}
                              >
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}/>

    {/* neha k */}

                  <FormField control={form.control} name="correspondenceAddress" render={({ field }) => (<FormItem><FormLabel>Correspondence Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                  {/* <FormField control={form.control} name="correspondenceState" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger></FormControl><SelectContent><SelectItem value="state1">State 1</SelectItem><SelectItem value="state2">State 2</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} /> */}
                  {/* CORRESPONDENCE STATE */}
                  <FormField
                    control={form.control}
                    name="correspondenceState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>

                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);

                            form.setValue('correspondenceCity', '');

                            fetchCitiesByState(
                              value,
                              'correspondence'
                            );
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select State" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {crewStates.map((item) => (
                              <SelectItem
                                key={item.value}
                                value={item.value.toString()}
                              >
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}/>


    {/* neha k */}

                  <FormField control={form.control} name="hireDate" render={({ field }) => (<FormItem><FormLabel>Hire Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="mobile" render={({ field }) => (<FormItem><FormLabel>Mobile</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="idProofType" render={({ field }) => (<FormItem><FormLabel>ID Proof Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Proof" /></SelectTrigger></FormControl><SelectContent>
                    <SelectItem value="aadhar">Aadhar</SelectItem>
                    <SelectItem value="pan">Pan Card</SelectItem>
                    <SelectItem value="license">Voter Id</SelectItem>
                    </SelectContent></Select><FormMessage /></FormItem>)} />
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
                  {/* <FormField control={form.control} name="permanentCity" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger></FormControl><SelectContent><SelectItem value="city1">City 1</SelectItem><SelectItem value="city2">City 2</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} /> */}
               {/* =========================
    ON SELECTION OF STATE
    SHOW CITY LIST FROM API
========================= */}
    <FormField
  control={form.control}
  name="permanentCity"
  render={({ field }) => (
    <FormItem>
      <FormLabel>City</FormLabel>

      <Select
        onValueChange={field.onChange}
        defaultValue={field.value}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select City" />
          </SelectTrigger>
        </FormControl>

        {/* ✅ DYNAMIC CITY FROM API */}
        <SelectContent>
  {permanentCities.map((item) => (
    <SelectItem
      key={item.value}
      value={item.value.toString()}
    >
      {item.name}
    </SelectItem>
  ))}
</SelectContent>

      </Select>

      <FormMessage />
    </FormItem>
  )}/>

                  <FormField control={form.control} name="correspondencePostalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
             
                  {/* <FormField control={form.control} name="correspondenceCity" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger></FormControl><SelectContent><SelectItem value="city1">City 1</SelectItem><SelectItem value="city2">City 2</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} /> */}
                  <FormField
  control={form.control}
  name="correspondenceCity"
  render={({ field }) => (
    <FormItem>
      <FormLabel>City</FormLabel>

      <Select
        onValueChange={field.onChange}
        defaultValue={field.value}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select City" />
          </SelectTrigger>
        </FormControl>

        {/* ✅ DYNAMIC CITY FROM API */}
        <SelectContent>
  {correspondenceCities.map((item) => (
    <SelectItem
      key={item.value}
      value={item.value.toString()}
    >
      {item.name}
    </SelectItem>
  ))}
</SelectContent>

      </Select>

      <FormMessage />
    </FormItem>
  )}/>
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