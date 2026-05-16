import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react'; // ✅ ADDED // neha k
import { API_BASE_URL } from '@/config/Api'; // neha k

//============== searchable dropdown library =============
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Command, CommandGroup, CommandInput, CommandItem, } from "@/components/ui/command";
//============== searchable dropdown library =============

const addCrewSchema = z.object({
  custId: z.string().optional(),
//  EmployeeId: z.number().nullable().optional(),

// designation: z.number({
//   required_error: 'Designation is required',
// }),
EmployeeId: z.coerce.number().nullable().optional(),

designation: z.coerce
  .number()
  .min(1, 'Designation is required'),
  employeeCode: z.string().min(1, 'Employee Code is required'),
  employeeType: z.string().min(1, 'Employee type is required'),
  contractDuration: z.union([z.string(), z.number()]).optional(),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  qualification: z.string().optional(),
  experience: z.string().optional(),
  permanentAddress: z.string().optional(),
  permanentPostalCode: z.string().optional(),
  permanentState: z.string().optional(),
  permanentCity: z.string().optional(),
  correspondenceAddress: z.string().optional(),
  correspondencePostalCode: z.string().optional(),
  correspondenceState: z.string().optional(),
  correspondenceCity: z.string().optional(),
  hireDate: z.string().optional(),
  ctc: z.string().optional(),
  role: z.string().optional(),
  officePhone: z.string().optional(),
  emergencyContact: z.string().optional(),
  mobile: z.string().optional(),
  idProofNo: z.string().optional(),
  idProofType: z.string().optional(),
  remarks: z.string().optional(),
  bloodGroup: z.string().optional(),
  imagePaths: z.string().optional(),

});

export type AddCrewFormValues = z.infer<typeof addCrewSchema>;
interface AddCrewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCrew: (data: AddCrewFormValues) => void;
}

const AddCrewDialog = ({ open, onOpenChange }: AddCrewDialogProps) => {
  const form = useForm<AddCrewFormValues>({
    resolver: zodResolver(addCrewSchema),
    // defaultValues: {
    //   contractDuration: "",
    // },
    defaultValues: {
  contractDuration: "",
  designation: 0,
  EmployeeId: null,
},
  });

  //======  File upload ==================
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    // if (!file) return;
    if (!file) {
  form.setValue("imagePaths", "");
  return;
}
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert(
        "Invalid File Type! Please upload image only."
      );
      return;
    }
    if (file.size > 102400) {
      alert("File size greater than 100 KB");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setSelectedFile(file);
    form.setValue("imagePaths", file.name);
  };
  const removeImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
    form.setValue("imagePaths", "");
  };
  //======  File upload ==================


  // =========================
  //API STATE FOR DESIGNATION,City,state neha k
  // =========================
  const [designations, setDesignations] = useState<any[]>([]); //neha k
  const [crewStates, setcrewStates] = useState<any[]>([]);
  const [permanentCities, setPermanentCities] = useState<any[]>([]);
  const [correspondenceCities, setCorrespondenceCities] = useState<any[]>([]);

  // =========================
  // FETCH DESIGNATIONS FROM API neha k
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
      // FIXED PARAMETER NAME
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

  const onSubmit = async (data: AddCrewFormValues) => {
    debugger
    const auth = JSON.parse(localStorage.getItem("trackmaster-auth") || "{}");
    const custId = Number(auth.custId || 0);
    try {
      // =========================
      // PREPARE PAYLOAD
      // =========================
      // Correspondence State Name
      const selectedCorrespondenceState = crewStates.find(
        (item) =>
          item.value.toString() ===
          data.correspondenceState
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
          item.value.toString() ===
          data.permanentState
      );
      // Permanent City Name
      const selectedPermanentCity =
        permanentCities.find(
          (item) =>
            item.value.toString() ===
            data.permanentCity
        );
      const payload = {
        Custid: custId,
        //custid: 45,
        // EmployeeId: data.EmployeeId || null,
        EmployeeId: data.EmployeeId ?? null,
        // designation: data.designation || "",
        designation: data.designation ?? 0,
        employeeCode: data.employeeCode || null,
        employeeType: data.employeeType || null,
        contractDuration: Number(data.contractDuration) || 0,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        qualification: data.qualification || null,
        experience: data.experience || null,
        permanentAddress: data.permanentAddress || null,
        permanentPostalCode: data.permanentPostalCode || null,
        permanentState: selectedPermanentState?.name || null,
        permanentCity: selectedPermanentCity?.name || null,
        correspondenceAddress: data.correspondenceAddress || null,
        correspondencePostalCode: data.correspondencePostalCode || null,
        correspondenceState: selectedCorrespondenceState?.name || null,
        correspondenceCity: selectedCorrespondenceCity?.name || null,
        hireDate: data.hireDate || null,
        employeeCTC: Number(data.ctc) || 0,
        role: data.role || null,
        officePhone: data.officePhone || null,
        emergencyContactInfo: data.emergencyContact || null,
        mobile: data.mobile || null,
        idProofNo: `${data.idProofType ?? ""}/${data.idProofNo ?? ""}`,
        idProofType: data.idProofType || null,
        remarks: data.remarks || null,
        bloodGroup: data.bloodGroup || null,
        imagePath: data.imagePaths || null,
      };
      console.log("PAYLOAD:", payload);
      // =========================
      // CREATE FORMDATA
      // =========================
      const formData = new FormData();
      // =========================
      // APPEND PAYLOAD FIELDS
      // =========================
      // Object.entries(payload).forEach(
      //   ([key, value]) => {
      //     formData.append(
      //       key,
      //       String(value)
      //     );
      //   }
      // );
      Object.entries(payload).forEach(([key, value]) => {
  formData.append(
    key,
    value == null ? "" : String(value)
  );
});
      // =========================
      // APPEND IMAGE FILE
      // =========================
      if (selectedFile) {
        formData.append(
          "ImageFiles",
          selectedFile,
          selectedFile.name
        );
      }
      // =========================
      // API CALL
      // =========================
      const response = await fetch(
        `${API_BASE_URL}/Reports/AddUpdateEmployee`,
        {
          method: "POST",
          body: formData,
        }
      );
      const result = await response.text();
      console.log("API RESPONSE:", result);
      // =========================
      // SUCCESS
      // =========================
      if (response.ok) {
        alert(
          result ||
          "Employee saved successfully"
        );
        // =========================
        // RESET FORM
        // =========================
        form.reset({
          custId: "",
          designation: 0,
          employeeCode: "",
          employeeType: "",
          firstName: "",
          lastName: "",
          qualification: "",
          experience: "",
          permanentAddress: "",
          permanentPostalCode: "",
          permanentState: "",
          permanentCity: "",
          correspondenceAddress: "",
          correspondencePostalCode: "",
          correspondenceState: "",
          correspondenceCity: "",
          hireDate: "",
          ctc: "",
          role: "",
          officePhone: "",
          emergencyContact: "",
          mobile: "",
          idProofNo: "",
          idProofType: "",
          remarks: "",
          bloodGroup: "",
          imagePaths: "",
        });
        // =========================
        // CLEAR IMAGE STATES
        // =========================
        setImagePreview(null);
        setSelectedFile(null);
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
        alert(
          result || "Failed to save employee"
        );
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
                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation</FormLabel>

                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full justify-between"
                              >
                                {field.value
                                  ? designations.find(
                                    (d) =>
                                      //  d.value.toString() === field.value
                                    d.value === field.value
                                  )?.name
                                  : "Select Designation"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>

                          <PopoverContent className="p-0 w-full min-w-[var(--radix-popover-trigger-width)]">
                            <Command>
                              <CommandInput placeholder="Search..." />

                              <CommandGroup>
                                {designations.map((item) => (
                                  <CommandItem
                                    key={item.value}
                                    value={item.name}
                                    onSelect={() => {
                                      // field.onChange(item.value.toString());
                                      field.onChange(Number(item.value));
                                    }}
                                  >
                                    {item.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  <FormField
                    control={form.control}
                    name="permanentState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {field.value
                                  ? crewStates.find(
                                    (item) =>
                                      item.value.toString() === field.value
                                  )?.name
                                  : "Select State"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>

                          <PopoverContent
                            className="p-0"
                            style={{
                              width: "var(--radix-popover-trigger-width)",
                            }}
                          >
                            <Command>
                              <CommandInput placeholder="Search state..." />

                              <CommandGroup className="max-h-64 overflow-y-auto">
                                {crewStates.map((item) => (
                                  <CommandItem
                                    key={item.value}
                                    value={item.name}
                                    onSelect={() => {
                                      const selectedValue =
                                        item.value.toString();

                                      field.onChange(selectedValue);

                                      // reset city
                                      form.setValue("permanentCity", "");

                                      // fetch city list
                                      fetchCitiesByState(
                                        selectedValue,
                                        "permanent"
                                      );
                                    }}
                                  >
                                    {item.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* neha k */}

                  <FormField control={form.control} name="correspondenceAddress" render={({ field }) => (<FormItem><FormLabel>Correspondence Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField
                    control={form.control}
                    name="correspondenceState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {field.value
                                  ? crewStates.find(
                                    (item) =>
                                      item.value.toString() === field.value
                                  )?.name
                                  : "Select State"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>

                          <PopoverContent
                            className="p-0"
                            style={{
                              width: "var(--radix-popover-trigger-width)",
                            }}
                          >
                            <Command>
                              <CommandInput placeholder="Search state..." />
                              <CommandGroup className="max-h-64 overflow-y-auto">
                                {crewStates.map((item) => (
                                  <CommandItem
                                    key={item.value}
                                    value={item.name}
                                    onSelect={() => {
                                      const selectedValue =
                                        item.value.toString();
                                      field.onChange(selectedValue);
                                      // reset city
                                      form.setValue(
                                        "correspondenceCity",
                                        ""
                                      );
                                      // fetch city list
                                      fetchCitiesByState(
                                        selectedValue,
                                        "correspondence"
                                      );
                                    }}
                                  >
                                    {item.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  <FormField
                    control={form.control}
                    name="imagePaths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Upload Employee Photo</FormLabel>

                        <FormControl>
                          {/* <Input
                            type="file"
                            accept=".jpg,.jpeg,.png,.gif"
                            onChange={(e) => {
                              field.onChange(e.target.files);

                              handleFileChange(e);
                            }}
                          /> */}
                          <Input
                            type="file"
                            accept=".jpg,.jpeg,.png,.gif"
                            onChange={(e) => {
                              handleFileChange(e);
                            }}
                          />
                        </FormControl>

                        <FormDescription>
                          Supported filetypes: jpg, jpeg, png, gif.
                          Max 100 KB.
                        </FormDescription>

                        {/* IMAGE PREVIEW */}
                        {imagePreview && (
                          <div className="mt-3">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-32 h-32 object-cover border rounded"
                            />

                            <Button
                              type="button"
                              variant="destructive"
                              className="mt-2"
                              onClick={removeImage}
                            >
                              Remove
                            </Button>
                          </div>
                        )}

                        <FormMessage />
                      </FormItem>
                    )} />



                </div>
                {/* Right Column */}
                <div className="space-y-4">
                  <FormField control={form.control} name="employeeCode" render={({ field }) => (<FormItem><FormLabel>Employee Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="contractDuration" render={({ field }) => (<FormItem><FormLabel>Contract Duration (Months)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="experience" render={({ field }) => (<FormItem><FormLabel>Experience</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="permanentPostalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField
                    control={form.control}
                    name="permanentCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>

                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {field.value
                                  ? permanentCities.find(
                                    (item) =>
                                      item.value.toString() === field.value
                                  )?.name
                                  : "Select City"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>

                          <PopoverContent
                            className="p-0"
                            style={{
                              width: "var(--radix-popover-trigger-width)",
                            }}
                          >
                            <Command>
                              <CommandInput placeholder="Search city..." />

                              <CommandGroup className="max-h-64 overflow-y-auto">
                                {permanentCities.map((item) => (
                                  <CommandItem
                                    key={item.value}
                                    value={item.name}
                                    onSelect={() => {
                                      field.onChange(
                                        item.value.toString()
                                      );
                                    }}
                                  >
                                    {item.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="correspondencePostalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField
                    control={form.control}
                    name="correspondenceCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>

                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {field.value
                                  ? correspondenceCities.find(
                                    (item) =>
                                      item.value.toString() === field.value
                                  )?.name
                                  : "Select City"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>

                          <PopoverContent
                            className="p-0"
                            style={{
                              width: "var(--radix-popover-trigger-width)",
                            }}
                          >
                            <Command>
                              <CommandInput placeholder="Search city..." />

                              <CommandGroup className="max-h-64 overflow-y-auto">
                                {correspondenceCities.map((item) => (
                                  <CommandItem
                                    key={item.value}
                                    value={item.name}
                                    onSelect={() => {
                                      field.onChange(
                                        item.value.toString()
                                      );
                                    }}
                                  >
                                    {item.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
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