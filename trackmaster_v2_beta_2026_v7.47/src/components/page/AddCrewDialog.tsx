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
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/Api';
import { useToast } from '@/hooks/use-toast';

//============== searchable dropdown library =============
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Command, CommandGroup, CommandInput, CommandItem, } from "@/components/ui/command";

//import { Command } from "@/components/ui/command";

//============== searchable dropdown library =============

const addCrewSchema = z.object({
  custId: z.string().optional(),
  EmployeeId: z.coerce.number().nullable().optional(),
  designation: z.coerce.number().min(1, 'Designation is required'),
  employeeCode: z.string().min(1, 'Employee Code is required'),
  employeeType: z.string().min(1, 'Employee type is required'),
  contractDuration: z.union([z.string(), z.number()]).optional(),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  qualification: z.string().optional(),
  experience: z.string().optional(),
  permanentAddress: z.string().optional(),
  permanentPostalCode: z.string().regex(/^\d{6}$/, "Postal code must be exactly 6 digits").optional().or(z.literal("")),
  permanentState: z.string().optional(),
  permanentCity: z.string().optional(),
  correspondenceAddress: z.string().optional(),
  correspondencePostalCode: z.string().regex(/^\d{6}$/, "Postal code must be exactly 6 digits").optional().or(z.literal("")),
  correspondenceState: z.string().optional(),
  correspondenceCity: z.string().optional(),
  hireDate: z.string().optional(),
  ctc: z.string().optional(),
  role: z.string().optional(),
  officePhone: z.string().regex(/^\d{10}$/, "Office phone number must be exactly 10 digits").optional().or(z.literal("")),
  emergencyContact: z.string().regex(/^\d{10}$/, "Emergency contact number must be exactly 10 digits").optional().or(z.literal("")),
  mobile: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits").optional().or(z.literal("")),
  idProofNo: z.string().optional(),
  idProofType: z.string().optional(),
  remarks: z.string().optional(),
  bloodGroup: z.string().regex(/^(A|B|AB|O)[+-]$/, "Blood group must be A+, A-, B+, B-, AB+, AB-, O+ or O-").optional().or(z.literal("")),
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
    defaultValues: {
      contractDuration: "",
      designation: 0,
      EmployeeId: null,
    },
    mode: "onSubmit",
  });
  const { toast } = useToast();

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
      alert("Invalid File Type! Please upload image only.");

      e.target.value = ""; // Clear file input
      setSelectedFile(null);
      setImagePreview(null);
      form.setValue("imagePaths", "");

      return;
    }
    if (file.size > 102400) {
      alert("File size greater than 100 KB");

      e.target.value = "";
      setSelectedFile(null);
      setImagePreview(null);
      form.setValue("imagePaths", "");

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
  const [designations, setDesignations] = useState<any[]>([]);
  const [designationOpen, setDesignationOpen] = useState(false);
  const [permanentStateOpen, setPermanentStateOpen] = useState(false);
  const [correspondenceStateOpen, setCorrespondenceStateOpen] = useState(false);
  const [crewStates, setcrewStates] = useState<any[]>([]);
  const [permanentCities, setPermanentCities] = useState<any[]>([]);
  const [correspondenceCities, setCorrespondenceCities] = useState<any[]>([]);
  const [permanentCityOpen, setPermanentCityOpen] = useState(false);
  const [correspondenceCityOpen, setCorrespondenceCityOpen] = useState(false);


  useEffect(() => {
  if (!open) {
    form.reset({
      designation: 0,
      EmployeeId: null,
      permanentState: "",
      permanentCity: "",
      correspondenceState: "",
      correspondenceCity: "",
    });

    setPermanentCities([]);
    setCorrespondenceCities([]);
  }
}, [open]);


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
        EmployeeId: data.EmployeeId ?? null,
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
        //employeeCTC: Number(data.ctc) || 0,
        employeeCTC: data.ctc ? Number(data.ctc) : null,
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
      const result = await response.json();
      console.log("API RESPONSE:", result);
      // =========================
      // SUCCESS
      // =========================
      if (response.ok) {
        toast({
          title: "Success",
          description: result.message || "Employee saved successfully",
        });
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
        toast({
          title: "Error",
          description: result || "Failed to save employee",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("API ERROR:", error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
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
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation</FormLabel>

                        {/* <Popover> */}
                        <Popover
                          open={designationOpen}
                          onOpenChange={setDesignationOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full justify-between"
                              >
                                {field.value
                                  ? designations.find(
                                    (d) =>
                                      Number(d.value) === Number(field.value)
                                  )?.name
                                  : "Select Designation"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>

                          <PopoverContent className="p-0 w-full min-w-[var(--radix-popover-trigger-width)]">
                            <Command
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();

                                  const input = e.currentTarget.querySelector(
                                    "input"
                                  ) as HTMLInputElement;

                                  const searchText = input?.value?.trim().toLowerCase();

                                  const selectedItem = designations.find(
                                    (d) => d.name.toLowerCase() === searchText
                                  );

                                  if (selectedItem) {
                                    field.onChange(Number(selectedItem.value));
                                    setDesignationOpen(false);
                                  }
                                }
                              }}
                            >
                              <CommandInput placeholder="Search..." />

                              <CommandGroup>
                                {designations.map((item) => (
                                  <CommandItem
                                    key={item.value}
                                    value={item.name}
                                    onSelect={() => {
                                      field.onChange(Number(item.value));
                                      setDesignationOpen(false);
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
                        {/* <Popover> */}
                        <Popover
                          open={permanentStateOpen}
                          onOpenChange={setPermanentStateOpen}
                        >
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

                            <Command
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();

                                  const input = e.currentTarget.querySelector(
                                    "input"
                                  ) as HTMLInputElement;

                                  const searchText = input?.value?.trim().toLowerCase();

                                  const selectedItem = crewStates.find(
                                    (s) => s.name.toLowerCase() === searchText
                                  );

                                  if (selectedItem) {
                                    const selectedValue = selectedItem.value.toString();

                                    field.onChange(selectedValue);

                                    form.setValue("permanentCity", "");

                                    fetchCitiesByState(selectedValue, "permanent");

                                    setPermanentStateOpen(false);
                                  }
                                }
                              }}
                            >
                              <CommandInput placeholder="Search state..." />

                              <CommandGroup className="max-h-64 overflow-y-auto">
                                {crewStates.map((item) => (
                                  <CommandItem
                                    key={item.value}
                                    value={item.name}
                                    onSelect={() => {
                                      const selectedValue = item.value.toString();

                                      field.onChange(selectedValue);

                                      form.setValue("permanentCity", "");

                                      fetchCitiesByState(selectedValue, "permanent");

                                      setPermanentStateOpen(false);
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
                        <Popover
                          open={correspondenceStateOpen}
                          onOpenChange={setCorrespondenceStateOpen}
                        >
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

                            <Command
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();

                                  const input = e.currentTarget.querySelector(
                                    "input"
                                  ) as HTMLInputElement;

                                  const searchText = input?.value?.trim().toLowerCase();

                                  const selectedItem = crewStates.find(
                                    (s) => s.name.toLowerCase() === searchText
                                  );

                                  if (selectedItem) {
                                    const selectedValue = selectedItem.value.toString();

                                    field.onChange(selectedValue);

                                    form.setValue("correspondenceCity", "");

                                    fetchCitiesByState(selectedValue, "correspondence");

                                    setCorrespondenceStateOpen(false);
                                  }
                                }
                              }}
                            >
                              <CommandInput placeholder="Search state..." />

                              <CommandGroup className="max-h-64 overflow-y-auto">
                                {crewStates.map((item) => (
                                  <CommandItem
                                    key={item.value}
                                    value={item.name}
                                    onSelect={() => {
                                      const selectedValue = item.value.toString();

                                      field.onChange(selectedValue);

                                      form.setValue("correspondenceCity", "");

                                      fetchCitiesByState(selectedValue, "correspondence");

                                      setCorrespondenceStateOpen(false);
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
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="Enter 10 digit mobile number"
                            maxLength={10}
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              field.onChange(value.slice(0, 10));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField control={form.control} name="idProofType" render={({ field }) => (<FormItem><FormLabel>ID Proof Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Proof" /></SelectTrigger></FormControl><SelectContent>
                    <SelectItem value="aadhar">Aadhar</SelectItem>
                    <SelectItem value="pan">Pan Card</SelectItem>
                    <SelectItem value="license">Voter Id</SelectItem>
                  </SelectContent></Select><FormMessage /></FormItem>)} />

                  <FormField
                    control={form.control}
                    name="bloodGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blood Group</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. A+, B+, AB-, O+"
                            maxLength={3}
                            onChange={(e) => {
                              const value = e.target.value
                                .toUpperCase()
                                .replace(/[^ABO+-]/g, "");

                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="imagePaths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Upload Employee Photo</FormLabel>

                        <FormControl>

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

                  {/* <FormField control={form.control} name="permanentPostalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /> */}
                  <FormField
                    control={form.control}
                    name="permanentPostalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter 6 digit postal code"
                            maxLength={6}
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              field.onChange(value.slice(0, 6));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="permanentCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>

                        <Popover
                          open={permanentCityOpen}
                          onOpenChange={setPermanentCityOpen}
                        >
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
                            <Command
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();

                                  const input = e.currentTarget.querySelector(
                                    "input"
                                  ) as HTMLInputElement;

                                  const searchText = input?.value?.trim().toLowerCase();

                                  const selectedItem = permanentCities.find(
                                    (c) => c.name.toLowerCase() === searchText
                                  );

                                  if (selectedItem) {
                                    field.onChange(selectedItem.value.toString());
                                    setPermanentCityOpen(false);
                                  }
                                }
                              }}
                            >
                              <CommandInput placeholder="Search city..." />

                              <CommandGroup className="max-h-64 overflow-y-auto">
                                {permanentCities.map((item) => (
                                  <CommandItem
                                    key={item.value}
                                    value={item.name}
                                    onSelect={() => {
                                      field.onChange(item.value.toString());
                                      setPermanentCityOpen(false);
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
                  {/* <FormField control={form.control} name="correspondencePostalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /> */}
                  <FormField
                    control={form.control}
                    name="correspondencePostalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter 6 digit postal code"
                            maxLength={6}
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              field.onChange(value.slice(0, 6));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="correspondenceCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>

                        <Popover
                          open={correspondenceCityOpen}
                          onOpenChange={setCorrespondenceCityOpen}
                        >
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


                            <Command
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();

                                  const input = e.currentTarget.querySelector(
                                    "input"
                                  ) as HTMLInputElement;

                                  const searchText = input?.value?.trim().toLowerCase();

                                  const selectedItem = correspondenceCities.find(
                                    (c) => c.name.toLowerCase() === searchText
                                  );

                                  if (selectedItem) {
                                    field.onChange(selectedItem.value.toString());
                                    setCorrespondenceCityOpen(false);
                                  }
                                }
                              }}
                            >
                              <CommandInput placeholder="Search city..." />

                              <CommandGroup className="max-h-64 overflow-y-auto">
                                {correspondenceCities.map((item) => (
                                  <CommandItem
                                    key={item.value}
                                    value={item.name}
                                    onSelect={() => {
                                      field.onChange(item.value.toString());
                                      setCorrespondenceCityOpen(false);
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
                  {/* <FormField control={form.control} name="officePhone" render={({ field }) => (<FormItem><FormLabel>Office Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} /> */}

                  <FormField
                    control={form.control}
                    name="officePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Office Phone</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="Enter 10 digit office phone number"
                            maxLength={10}
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              field.onChange(value.slice(0, 10));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* <FormField control={form.control} name="emergencyContact" render={({ field }) => (<FormItem><FormLabel>Emergency Contact</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} /> */}
                  <FormField
                    control={form.control}
                    name="emergencyContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="Enter 10 digit emergency contact number"
                            maxLength={10}
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              field.onChange(value.slice(0, 10));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="idProofNo" render={({ field }) => (<FormItem><FormLabel>ID Proof No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
             
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset({
                    designation: 0,
                    EmployeeId: null,
                    permanentState: "",
                    permanentCity: "",
                    correspondenceState: "",
                    correspondenceCity: "",
                  });

                  setPermanentCities([]);
                  setCorrespondenceCities([]);

                  form.clearErrors();
                  onOpenChange(false);
                }}
              >
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