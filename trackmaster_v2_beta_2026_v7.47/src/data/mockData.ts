import { subDays, formatISO, format, addHours, subHours, startOfDay, isWithinInterval, parse, endOfDay, addMinutes, addSeconds } from 'date-fns';
import { Clock, Gauge, type LucideIcon, Power, Ban, BatteryWarning, MapPin, ArrowUp, ArrowDown, Undo2, Fuel, Droplets, Box, Thermometer } from 'lucide-react';



// let NUM_VEHICLES = 50;

let NUM_VEHICLES = 50;

  // export async function getVehicleCount(): Promise<number> {
  //   // debugger;
  //     try {
  //         const auth = JSON.parse(localStorage.getItem("trackmaster-auth") || "{}");
  //         const custId = auth.custId;

          
  //         const url = `${API_BASE_URL}/api/Dashboard/dashboarddata?userid=${custId}`;

  //       const res = await fetch(url, { method: "GET" });

  //       const response = await res.json();
  //         if (!res.ok) {
  //             throw new Error("Failed API");
  //         }

  //         const data = response.data;

  //         NUM_VEHICLES = data.totalVehicles; // ✅ store here
  //         return NUM_VEHICLES;              // ✅ return value

  //     } catch (err) {
  //         console.log(err);
  //         return 0;
  //     }
  // }
  //         // correct value
  // console.log(NUM_VEHICLES);  // also updated

const NUM_DAYS_OF_DATA = 90;

export type VehicleStatus = 'Moving' | 'Parked' | 'Unreachable' | 'Breakdown' | 'Ignition On' | 'Battery Disconnect' | 'High Speed' | 'Towed' | 'Idle';

export const VEHICLE_TYPES = {
  'Ambulance': { prefix: 'AMB', models: ['Force Traveller', 'Tata Winger'], make: 'Various' },
  'Backhoe Loader': { prefix: 'BHL', models: ['JCB 3DX', 'CAT 424'], make: 'JCB/CAT' },
  'Bolero': { prefix: 'BOL', models: ['Bolero', 'Bolero Neo'], make: 'Mahindra' },
  'Bolero Camper': { prefix: 'BCM', models: ['Bolero Camper'], make: 'Mahindra' },
  'Boom Placer': { prefix: 'BMP', models: ['Schwing Stetter', 'Putzmeister'], make: 'Various' },
  'Bus': { prefix: 'BUS', models: ['Volvo 9400', 'Tata Marcopolo'], make: 'Various' },
  'Car': { prefix: 'CAR', models: ['Swift', 'Creta'], make: 'Various' },
  'Concrete Mixture': { prefix: 'CMX', models: ['Schwing Stetter', 'Ajax Fiori'], make: 'Various' },
  'Crane': { prefix: 'CRN', models: ['Liebherr LTM 1050', 'Grove GMK4100L'], make: 'Various' },
  'Excavator': { prefix: 'EXC', models: ['Komatsu PC210', 'Tata Hitachi EX200'], make: 'Various' },
  'Fire Truck': { prefix: 'FTR', models: ['Rosenbauer Panther', 'Brijbasi'], make: 'Various' },
  'Generator': { prefix: 'GEN', models: ['Kirloskar', 'Cummins'], make: 'Various' },
  'Hydra': { prefix: 'HYD', models: ['Escorts Hydra 14'], make: 'Escorts' },
  'Innova': { prefix: 'INV', models: ['Innova Crysta', 'Innova Hycross'], make: 'Toyota' },
  'JCB': { prefix: 'JCB', models: ['JCB 3DX', 'JCB 4DX'], make: 'JCB' },
  'Jeep': { prefix: 'JEP', models: ['Compass', 'Wrangler'], make: 'Jeep' },
  'Pick Up': { prefix: 'PCK', models: ['Isuzu D-Max', 'Tata Yodha'], make: 'Various' },
  'Road Grader': { prefix: 'RDG', models: ['CAT 120', 'Komatsu GD535'], make: 'Various' },
  'Road Roller': { prefix: 'RRL', models: ['Escorts EC5250', 'Hamm HD 99'], make: 'Various' },
  'Scorpio': { prefix: 'SCP', models: ['Scorpio-N', 'Scorpio Classic'], make: 'Mahindra' },
  'Soil Compactor': { prefix: 'SCM', models: ['Volvo SD110', 'Case 1107 EX'], make: 'Various' },
  'Sweeping Machine': { prefix: 'SWM', models: ['Dulevo 5000', 'Roots Sweep'], make: 'Various' },
  'Tanker': { prefix: 'TNK', models: ['Tata Signa', 'Ashok Leyland'], make: 'Various' },
  'Tipper': { prefix: 'TPR', models: ['Tata Prima', 'BharatBenz'], make: 'Various' },
  'Tractor': { prefix: 'TRC', models: ['John Deere 5310', 'Mahindra Arjun'], make: 'Various' },
  'Trailer': { prefix: 'TRL', models: ['Tata Signa', 'Volvo FM'], make: 'Various' },
  'Transit Mixer': { prefix: 'TMX', models: ['Tata Prima', 'Ashok Leyland'], make: 'Various' },
  'Truck': { prefix: 'TRK', models: ['Tata Ultra', 'Eicher Pro'], make: 'Various' },
  'Van': { prefix: 'VAN', models: ['Maruti Eeco', 'Tata Winger'], make: 'Various' },
  'Water Tanker': { prefix: 'WTK', models: ['Tata LPT', 'Ashok Leyland Ecomet'], make: 'Various' },
};

const LOCATIONS = [
    { name: 'Mumbai Site A', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi Quarry', lat: 28.7041, lng: 77.1025 },
    { name: 'Bangalore Metro Project', lat: 12.9716, lng: 77.5946 },
    { name: 'Chennai Port', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata Flyover', lat: 22.5726, lng: 88.3639 },
    { name: 'Hyderabad Airport Expansion', lat: 17.2403, lng: 78.4294 },
    { name: 'Pune Industrial Park', lat: 18.5204, lng: 73.8567 },
    { name: 'Ahmedabad Smart City', lat: 23.0225, lng: 72.5714 },
];
const DRIVERS = ['Ramesh Kumar', 'Suresh Patel', 'Vijay Singh', 'Anil Sharma', 'Sunil Gupta', 'Manoj Verma', 'Rajesh Reddy', 'Sanjay Yadav', 'Deepak Chauhan', 'Prakash Mishra'];
const ERROR_CODES = [
  { code: 'E-101', description: 'Low Hydraulic Pressure' },
  { code: 'E-204', description: 'Engine Overheat Warning' },
  { code: 'E-305', description: 'Sensor Malfunction (Track A)' },
  { code: 'E-410', description: 'ECU Communication Failure' },
  { code: 'F-015', description: 'Fuel Injector Fault' },
];

// --- 1. GENERATE BASE VEHICLE LIST ---
const generateVehicles = () => {
  const vehicleList: {
    id: string;
    name: string;
    type: string;
    model: string;
    make: string;
    driver: string | null;
    odometer: number;
    status: 'In Use' | 'Inactive';
    blackbox: boolean;
    remarks: string;
    fuelTankCapacity: number;
  }[] = [];
  const typeKeys = Object.keys(VEHICLE_TYPES);

  for (let i = 0; i < NUM_VEHICLES; i++) {
    const type = typeKeys[i % typeKeys.length] as keyof typeof VEHICLE_TYPES;
    const typeInfo = VEHICLE_TYPES[type];
    const model = typeInfo.models[i % typeInfo.models.length];
    const id = `${typeInfo.prefix}-${String(i + 1).padStart(3, '0')}`;
    const name = `${model} #${i + 1}`;
    
    vehicleList.push({ 
      id, 
      name, 
      type, 
      model,
      make: typeInfo.make,
      driver: Math.random() > 0.3 ? DRIVERS[i % DRIVERS.length] : null,
      odometer: Math.floor(Math.random() * 100000),
      status: Math.random() > 0.2 ? 'In Use' : 'Inactive',
      blackbox: Math.random() > 0.5,
      remarks: Math.random() > 0.8 ? 'Needs oil change' : '',
      fuelTankCapacity: Math.floor(Math.random() * 201) + 200, // 200-400L
    });
  }
  return vehicleList;
};

export const actualVehicles = generateVehicles();
export const vehicles = [{ id: 'all', name: 'All Vehicles' }, ...actualVehicles.map(m => ({ id: m.id, name: m.name }))];

// --- 2. GENERATE DAILY TIME-SERIES DATA (SOURCE OF TRUTH) ---
let cumulativeHoursMap = new Map(actualVehicles.map(m => [m.id, Math.random() * 1000 + 500]));

const dailyRecords: any[] = [];
const today = new Date();

for (let i = NUM_DAYS_OF_DATA - 1; i >= 0; i--) {
  const date = subDays(today, i);
  for (const vehicle of actualVehicles) {
    // Simulate days off (e.g., Sundays or random maintenance)
    if (date.getDay() === 0 || Math.random() > 0.9) {
      continue;
    }

    const workingHours = parseFloat((Math.random() * 6 + 2).toFixed(1)); // 2-8 hours
    const idlingHours = parseFloat((workingHours * (Math.random() * 0.4 + 0.1)).toFixed(1)); // 10-50% of working hours is idling
    const fuelConsumed = parseFloat((workingHours * (Math.random() * 10 + 5)).toFixed(1)); // 5-15 L/hr
    const distance = workingHours * (Math.random() * 15 + 25); // Simulate avg speed between 25-40 km/h
    const currentCumulative = cumulativeHoursMap.get(vehicle.id)!;
    cumulativeHoursMap.set(vehicle.id, currentCumulative + workingHours);

    const nextServiceAt = Math.ceil((currentCumulative + workingHours) / 500) * 500;
    let serviceStatus = 'OK';
    if (nextServiceAt - (currentCumulative + workingHours) < 50) serviceStatus = 'Due Soon';
    if ((currentCumulative + workingHours) >= nextServiceAt) serviceStatus = 'Overdue';

    const highTempAlerts = Math.random() > 0.9 ? 1 : 0;
    const errorCount = serviceStatus === 'Overdue' && Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;
    const location = LOCATIONS[i % LOCATIONS.length];

    dailyRecords.push({
      id: `${vehicle.id}-${formatISO(date, { representation: 'date' })}`,
      date: formatISO(date, { representation: 'date' }),
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      location: location.name,
      lat: location.lat + (Math.random() - 0.5) * 0.1,
      lng: location.lng + (Math.random() - 0.5) * 0.1,
      workingHours,
      idlingHours,
      distance: parseFloat(distance.toFixed(1)),
      fuelConsumed,
      cumulativeHours: parseFloat((currentCumulative + workingHours).toFixed(1)),
      nextServiceAt,
      serviceStatus,
      alertsCount: highTempAlerts + (serviceStatus !== 'OK' ? 1 : 0),
      errorCount,
    });
  }
}

export const consolidatedReportTableData = dailyRecords;

// --- 3. GENERATE DETAILED LOGS BASED ON DAILY RECORDS ---

// Working Hour Details
export const workingHourDetails: { id: string; vehicleId: string; date: string; startTime: string; endTime: string; duration: number; location: string; }[] = [];
dailyRecords.forEach(record => {
  let remainingHours = record.workingHours;
  let lastEndTime = addHours(startOfDay(new Date(record.date)), 8); // Start at 8 AM
  let session = 1;
  while (remainingHours > 0) {
    const duration = Math.min(remainingHours, parseFloat((Math.random() * 2.5 + 1).toFixed(1)));
    const startTime = lastEndTime;
    const endTime = addHours(startTime, duration);
    workingHourDetails.push({
      id: `${record.id}-s${session++}`,
      vehicleId: record.vehicleId,
      date: record.date,
      startTime: format(startTime, 'HH:mm'),
      endTime: format(endTime, 'HH:mm'),
      duration,
      location: record.location,
    });
    remainingHours -= duration;
    lastEndTime = addHours(endTime, Math.random() * 1.5 + 0.5); // 30min to 2hr break
  }
});

// Fuel Filling Details
export const fuelFillingDetails: { id: string; vehicleId: string; date: string; beforeFillingDate: string; beforeFilling: number; afterFillingDate: string; afterFilling: number; filling: number; fillingStation: string; }[] = [];
const fillingStations = ['HP Petrol Pump, Mumbai', 'IOCL, Delhi', 'BPCL, Bangalore', 'Reliance Fuel, Chennai'];

dailyRecords.forEach(record => {
    const isToday = record.date === formatISO(today, { representation: 'date' });
    const isDefaultVehicle = record.vehicleId === actualVehicles[0].id;

    // Force an event for the default vehicle today, otherwise use random chance
    if ((isDefaultVehicle && isToday) || Math.random() > 0.5) {
        const fillingCount = (isDefaultVehicle && isToday) ? 1 : Math.floor(Math.random() * 2) + 1;
        let lastFillingTime = addHours(startOfDay(new Date(record.date)), 9);

        for (let i = 0; i < fillingCount; i++) {
            const beforeFilling = Math.floor(Math.random() * 20 + 10); // 10-30% fuel
            const fillingAmount = (isDefaultVehicle && isToday) ? 50 : Math.floor(Math.random() * 50 + 30);
            const afterFilling = Math.min(beforeFilling + fillingAmount, 100);
            
            const beforeTime = lastFillingTime;
            const afterTime = addMinutes(beforeTime, Math.random() * 10 + 5); // 5-15 mins to fill

            fuelFillingDetails.push({
                id: `${record.id}-ff-${i}`,
                vehicleId: record.vehicleId,
                date: record.date,
                beforeFillingDate: format(beforeTime, 'yyyy-MM-dd HH:mm'),
                beforeFilling: beforeFilling,
                afterFillingDate: format(afterTime, 'yyyy-MM-dd HH:mm'),
                afterFilling: afterFilling,
                filling: fillingAmount,
                fillingStation: fillingStations[i % fillingStations.length],
            });

            lastFillingTime = addHours(afterTime, Math.random() * 4 + 2); // Next filling in 2-6 hours
        }
    }
});

// Add more realistic data for TR-001
fuelFillingDetails.push(
  { id: 'ff-today-1', vehicleId: 'TR-001', date: format(today, 'yyyy-MM-dd'), beforeFillingDate: format(addHours(startOfDay(today), 10), 'yyyy-MM-dd HH:mm'), beforeFilling: 50, afterFillingDate: format(addMinutes(addHours(startOfDay(today), 10), 10), 'yyyy-MM-dd HH:mm'), afterFilling: 200, filling: 150, fillingStation: 'IOCL, Panvel' },
  { id: 'ff-today-2', vehicleId: 'TR-001', date: format(today, 'yyyy-MM-dd'), beforeFillingDate: format(addHours(startOfDay(today), 18), 'yyyy-MM-dd HH:mm'), beforeFilling: 80, afterFillingDate: format(addMinutes(addHours(startOfDay(today), 18), 8), 'yyyy-MM-dd HH:mm'), afterFilling: 180, filling: 100, fillingStation: 'BPCL, Lonavala' }
);

// Fuel Theft/Drainage Details
export const fuelTheftDetails: { id: string; vehicleId: string; date: string; beforeDrainDate: string; beforeDrain: number; afterDrainDate: string; afterDrain: number; drainage: number; drainageLocation: string; }[] = [];
dailyRecords.forEach(record => {
    const isToday = record.date === formatISO(today, { representation: 'date' });
    const isDefaultVehicle = record.vehicleId === actualVehicles[0].id;

    // Force an event for the default vehicle today, otherwise use random chance
    if ((isDefaultVehicle && isToday) || Math.random() > 0.9) {
        const beforeDrain = Math.floor(Math.random() * 40 + 50); // 50-90% fuel
        const drainageAmount = (isDefaultVehicle && isToday) ? 15 : Math.floor(Math.random() * 15 + 5);
        const afterDrain = Math.max(0, beforeDrain - drainageAmount);
        
        const beforeTime = addHours(startOfDay(new Date(record.date)), Math.random() * 4 + 18); // Theft happens at night 18:00 - 22:00
        const afterTime = addMinutes(beforeTime, Math.random() * 20 + 10); // 10-30 mins for theft

        fuelTheftDetails.push({
            id: `${record.id}-ft-1`,
            vehicleId: record.vehicleId,
            date: record.date,
            beforeDrainDate: format(beforeTime, 'yyyy-MM-dd HH:mm'),
            beforeDrain: beforeDrain,
            afterDrainDate: format(afterTime, 'yyyy-MM-dd HH:mm'),
            afterDrain: afterDrain,
            drainage: drainageAmount,
            drainageLocation: record.location,
        });
    }
});

// Add more realistic data for TR-001
fuelTheftDetails.push(
  { id: 'ft-today-1', vehicleId: 'TR-001', date: format(today, 'yyyy-MM-dd'), beforeDrainDate: format(addHours(startOfDay(today), 14), 'yyyy-MM-dd HH:mm'), beforeDrain: 180, afterDrainDate: format(addMinutes(addHours(startOfDay(today), 14), 5), 'yyyy-MM-dd HH:mm'), afterDrain: 160, drainage: 20, drainageLocation: 'Near Food Mall, Expressway' },
  { id: 'ft-today-2', vehicleId: 'TR-001', date: format(today, 'yyyy-MM-dd'), beforeDrainDate: format(addHours(startOfDay(today), 23), 'yyyy-MM-dd HH:mm'), beforeDrain: 150, afterDrainDate: format(addMinutes(addHours(startOfDay(today), 23), 3), 'yyyy-MM-dd HH:mm'), afterDrain: 135, drainage: 15, drainageLocation: 'Parking Yard, Pune' }
);

// Fuel Rod Disconnection Details
export const fuelDisconnectionDetails: {
  id: string;
  vehicleId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
  type: 'Disconnection' | 'Dirt Error';
  location: string;
}[] = [];

dailyRecords.forEach(record => {
    // 20% chance of having a disconnection/dirt event
    if (Math.random() > 0.8) {
        const eventCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 events per day
        let lastEventTime = addHours(startOfDay(new Date(record.date)), 8);

        for (let i = 0; i < eventCount; i++) {
            const type = Math.random() > 0.4 ? 'Disconnection' : 'Dirt Error';
            const durationSeconds = Math.floor(Math.random() * 1800 + 60); // 1 to 30 minutes
            
            const startTime = addMinutes(lastEventTime, Math.random() * 120 + 30); // 30-150 mins after last event
            const endTime = addSeconds(startTime, durationSeconds);

            fuelDisconnectionDetails.push({
                id: `${record.id}-fd-${i}`,
                vehicleId: record.vehicleId,
                date: record.date,
                startTime: format(startTime, 'yyyy-MM-dd HH:mm:ss'),
                endTime: format(endTime, 'yyyy-MM-dd HH:mm:ss'),
                duration: durationSeconds,
                type,
                location: record.location,
            });

            lastEventTime = endTime;
        }
    }
});

// Alerts Data
interface AlertRecord {
  vehicleId: string;
  vehicleName: string;
  dateTime: string;
  alertType: string;
  value: string;
  location: string;
  description?: string;
  [key: string]: any;
}
const allAlerts: AlertRecord[] = [];
const randomAlertTypes = ['High RPM', 'Geofencing', 'Low Battery', 'Hydraulic Temp'];
dailyRecords.forEach(record => {
  const recordDate = new Date(record.date);
  // Service Alert
  if (record.serviceStatus !== 'OK') {
    allAlerts.push({
      vehicleId: record.vehicleId, vehicleName: record.vehicleName, dateTime: format(addHours(recordDate, 9), 'yyyy-MM-dd HH:mm'),
      alertType: 'Service', value: record.serviceStatus, location: record.location,
    });
  }
  // Engine Temp Alert
  if (record.alertsCount > (record.serviceStatus !== 'OK' ? 1 : 0)) {
     allAlerts.push({
      vehicleId: record.vehicleId, vehicleName: record.vehicleName, dateTime: format(addHours(recordDate, 14), 'yyyy-MM-dd HH:mm'),
      alertType: 'Engine Temp', value: `${(Math.random() * 10 + 95).toFixed(1)}°C`, location: record.location,
    });
  }
  // Generate some random alerts for more variety
  if (Math.random() < 0.3) { // 30% chance of having extra random alerts for a given day
    const numExtraAlerts = Math.floor(Math.random() * 4) + 1; // 1 to 4 extra alerts
    for (let i = 0; i < numExtraAlerts; i++) {
      const alertType = randomAlertTypes[Math.floor(Math.random() * randomAlertTypes.length)];
      let value = 'Triggered';
      if (alertType === 'Hydraulic Temp') {
        value = `${(Math.random() * 15 + 80).toFixed(1)}°C`; // 80-95°C
      }
      allAlerts.push({
        vehicleId: record.vehicleId, vehicleName: record.vehicleName, dateTime: format(addHours(recordDate, 10 + i*2), 'yyyy-MM-dd HH:mm'),
        alertType: alertType, value: value, location: record.location,
      });
    }
  }
});
export const alertsData: Record<string, AlertRecord[]> = {
  'High RPM': allAlerts.filter(a => a.alertType === 'High RPM'),
  'Engine Temp': allAlerts.filter(a => a.alertType === 'Engine Temp'),
  'Hydraulic Temp': allAlerts.filter(a => a.alertType === 'Hydraulic Temp'),
  'Error Code': [],
  'Geofencing': allAlerts.filter(a => a.alertType === 'Geofencing'),
  'Low Battery': allAlerts.filter(a => a.alertType === 'Low Battery'),
  'Service': allAlerts.filter(a => a.alertType === 'Service'),
};

// Error Code Data
export const errorCodeData: { id: string; dateTime: string; vehicleId: string; vehicleName: string; errorCode: string; description: string; location: string; }[] = [];
dailyRecords.forEach(record => {
  if (record.errorCount > 0) {
    for (let i = 0; i < record.errorCount; i++) {
      const error = ERROR_CODES[Math.floor(Math.random() * ERROR_CODES.length)];
      errorCodeData.push({
        id: `${record.id}-e${i}`,
        dateTime: format(addHours(new Date(record.date), 11 + i), 'yyyy-MM-dd HH:mm'),
        vehicleId: record.vehicleId,
        vehicleName: record.vehicleName,
        errorCode: error.code,
        description: error.description,
        location: record.location,
      });
    }
  }
});
alertsData['Error Code'] = errorCodeData.map(e => ({ ...e, value: e.errorCode, alertType: 'Error Code' }));


// Other Report Data derived from alerts
export const engineTempData = alertsData['Engine Temp'].map((a, i) => ({
  id: `ET-${i}`, dateTime: a.dateTime, vehicleId: a.vehicleId, vehicleName: a.vehicleName,
  location: a.location, engineTemp: parseFloat(a.value), status: 'High'
}));

// ADDING MANUAL DATA FOR SV-016
const todayDateForTemp = format(new Date(), 'yyyy-MM-dd');
const vehicleIdForTemp = 'SV-016';
const vehicleNameForTemp = 'SV100-2A #16';
const locationForTemp = 'Pune Industrial Park';

const extraEngineTempData = [
  { id: 'ET-extra-1', dateTime: `${todayDateForTemp} 10:15`, vehicleId: vehicleIdForTemp, vehicleName: vehicleNameForTemp, location: locationForTemp, engineTemp: 98.5, status: 'High' },
  { id: 'ET-extra-2', dateTime: `${todayDateForTemp} 10:45`, vehicleId: vehicleIdForTemp, vehicleName: vehicleNameForTemp, location: locationForTemp, engineTemp: 101.2, status: 'High' },
  { id: 'ET-extra-3', dateTime: `${todayDateForTemp} 11:30`, vehicleId: vehicleIdForTemp, vehicleName: vehicleNameForTemp, location: locationForTemp, engineTemp: 97.8, status: 'High' },
  { id: 'ET-extra-4', dateTime: `${todayDateForTemp} 12:05`, vehicleId: vehicleIdForTemp, vehicleName: vehicleNameForTemp, location: locationForTemp, engineTemp: 99.1, status: 'High' },
  { id: 'ET-extra-5', dateTime: `${todayDateForTemp} 14:20`, vehicleId: vehicleIdForTemp, vehicleName: vehicleNameForTemp, location: locationForTemp, engineTemp: 102.5, status: 'High' },
  { id: 'ET-extra-6', dateTime: `${todayDateForTemp} 09:05`, vehicleId: vehicleIdForTemp, vehicleName: vehicleNameForTemp, location: locationForTemp, engineTemp: 72.3, status: 'Low' },
  { id: 'ET-extra-7', dateTime: `${todayDateForTemp} 09:30`, vehicleId: vehicleIdForTemp, vehicleName: vehicleNameForTemp, location: locationForTemp, engineTemp: 68.9, status: 'Low' },
  { id: 'ET-extra-8', dateTime: `${todayDateForTemp} 15:00`, vehicleId: vehicleIdForTemp, vehicleName: vehicleNameForTemp, location: locationForTemp, engineTemp: 74.1, status: 'Low' },
  { id: 'ET-extra-9', dateTime: `${todayDateForTemp} 15:45`, vehicleId: vehicleIdForTemp, vehicleName: vehicleNameForTemp, location: locationForTemp, engineTemp: 70.5, status: 'Low' },
  { id: 'ET-extra-10', dateTime: `${todayDateForTemp} 16:30`, vehicleId: vehicleIdForTemp, vehicleName: vehicleNameForTemp, location: locationForTemp, engineTemp: 65.0, status: 'Low' },
];

engineTempData.push(...extraEngineTempData);

export const hydraulicTempData = alertsData['Hydraulic Temp'].map((a, i) => ({
  id: `HT-${i}`, dateTime: a.dateTime, vehicleId: a.vehicleId, vehicleName: a.vehicleName,
  location: a.location, hydraulicTemp: parseFloat(a.value), status: 'High'
}));

// Fuel Data
export const fuelData = dailyRecords.map(r => {
  const averageSpeedKmph = 17.80;
  const distance = r.workingHours * averageSpeedKmph;
  const economy = r.fuelConsumed > 0 ? distance / r.fuelConsumed : 0;
  return {
    date: r.date,
    vehicleId: r.vehicleId,
    consumption: r.fuelConsumed,
    economy: parseFloat(economy.toFixed(1)),
  };
});

export const workingHoursData = dailyRecords.map(r => ({
  date: r.date, vehicleId: r.vehicleId, machineHours: r.workingHours, idleTime: 0, startTime: '08:00', endTime: '17:00'
}));

export const currentFuelLevelData: { id: string; dateTime: string; vehicleId: string; vehicleName: string; location: string; fuelLevel: number; fuelLiters: number; }[] = [];
dailyRecords.forEach((record, i) => {
    const vehicle = actualVehicles.find(v => v.id === record.vehicleId);
    const fuelLevel = Math.floor(Math.random() * 80 + 20);
    const fuelLiters = vehicle ? (fuelLevel / 100) * vehicle.fuelTankCapacity : 0;
    currentFuelLevelData.push({
        id: `FL-${i}`,
        dateTime: format(addHours(new Date(record.date), 10), 'yyyy-MM-dd HH:mm'),
        vehicleId: record.vehicleId,
        vehicleName: record.vehicleName,
        location: record.location,
        fuelLevel: fuelLevel,
        fuelLiters: fuelLiters,
    });
});


// --- 4. GENERATE LIVE & DASHBOARD DATA ---

// Live Status
const vehicleStatuses: VehicleStatus[] = ['Moving', 'Parked', 'Unreachable', 'Breakdown', 'Ignition On', 'Battery Disconnect', 'High Speed', 'Towed', 'Idle'];
const now = new Date();
const todayStart = startOfDay(now);
const todayEnd = endOfDay(now);

export const liveStatusData = actualVehicles.map((vehicle, i) => {
  const latestRecord = dailyRecords.filter(r => r.vehicleId === vehicle.id).pop();
  
  const recentAlerts = allAlerts.filter(a => {
    const alertDate = parse(a.dateTime, 'yyyy-MM-dd HH:mm', new Date());
    return a.vehicleId === vehicle.id && isWithinInterval(alertDate, { start: todayStart, end: todayEnd });
  });

  const recentErrors = errorCodeData.filter(e => {
    const errorDate = parse(e.dateTime, 'yyyy-MM-dd HH:mm', new Date());
    return e.vehicleId === vehicle.id && isWithinInterval(errorDate, { start: todayStart, end: todayEnd });
  });

  const status = vehicleStatuses[i % vehicleStatuses.length];
  const fuelLevelPercentage = Math.floor(Math.random() * 80) + 20;

  let sensorStatus: 'ok' | 'disconnected' | 'dirt_error' = 'ok';
  if (i % 15 === 0) {
    sensorStatus = 'disconnected';
  } else if (i % 20 === 0) {
    sensorStatus = 'dirt_error';
  }

  return {
    id: String(i + 1),
    type: vehicle.type,
    vehicleNo: vehicle.id,
    model: vehicle.model,
    status: status,
    lastUpdated: format(subHours(new Date(), Math.random()), 'dd-MMM-yyyy hh:mm:ss a'),
    location: latestRecord?.location || LOCATIONS[i % LOCATIONS.length].name,
    lat: latestRecord?.lat || LOCATIONS[i % LOCATIONS.length].lat,
    lng: latestRecord?.lng || LOCATIONS[i % LOCATIONS.length].lng,
    workingHours: latestRecord?.workingHours || 0,
    idlingHours: latestRecord?.idlingHours || 0,
    fuelConsumed: latestRecord?.fuelConsumed || 0,
    gsmSignal: Math.floor(Math.random() * 5),
    deviceSignal: Math.floor(Math.random() * 5),
    battery: Math.floor(Math.random() * 50) + 50, // Vehicle Battery
    gpsDeviceBattery: Math.floor(Math.random() * 70) + 30, // GPS Device Battery
    alerts: recentAlerts.length,
    errors: recentErrors.length,
    alertDetails: recentAlerts.map(a => a.alertType),
    errorDetails: recentErrors.map(e => e.errorCode),
    speed: status === 'Moving' ? Math.floor(Math.random() * 40) + 20 : 0,
    distance: latestRecord?.distance || 0,
    fuelLevel: fuelLevelPercentage,
    fuelLiters: (fuelLevelPercentage / 100) * vehicle.fuelTankCapacity,
    fuelTankCapacity: vehicle.fuelTankCapacity,
    engineTemp: Math.floor(Math.random() * 20) + 85,
    hydraulicTemp: Math.floor(Math.random() * 35) + 50,
    sensorStatus,
    acStatus: Math.random() > 0.5 ? 'On' : 'Off',
    ignitionStatus: ['Moving', 'Ignition On', 'Idle'].includes(status) ? 'On' : 'Off',
  };
});
export type LiveVehicleStatus = typeof liveStatusData[0];

// Dashboard Widgets
export const vehicleSummary = liveStatusData.map(d => ({
  id: d.id, vehicle: d.vehicleNo, driver: DRIVERS[parseInt(d.id) % DRIVERS.length],
  status: d.status, speed: d.status === 'Moving' ? `${Math.floor(Math.random() * 20) + 10} km/h` : '0 km/h',
  fuelLevel: d.fuelLevel,
  fuelLiters: d.fuelLiters,
}));

export const dashboardAlertsData = {
  vehicleAlerts: [
    { id: 'ignition-on', label: 'IgnitionOn Alert', count: 32, Icon: Power, color: 'text-green-500' },
    { id: 'halt', label: 'Halt Alert', count: 5, Icon: Ban, color: 'text-orange-500' },
    { id: 'battery-disconnect', label: 'Battery Disconnect', count: 3, Icon: BatteryWarning, color: 'text-purple-500' },
    { id: 'geofencing', label: 'Geofence Alert', count: 8, Icon: MapPin, color: 'text-blue-500' },
  ],
  drivingBehaviourAlerts: [
    { id: 'high-rpm', label: 'Overspeed Alert', count: 15, Icon: Gauge, color: 'text-yellow-600' },
    { id: 'harsh-acceleration', label: 'Harsh Acceleration', count: 7, Icon: ArrowUp, color: 'text-red-500' },
    { id: 'harsh-braking', label: 'Harsh Braking', count: 12, Icon: ArrowDown, color: 'text-red-500' },
    { id: 'rash-turn', label: 'Rash Turn', count: 4, Icon: Undo2, color: 'text-red-500' },
  ],
  fuelAlerts: [
    { id: 'fuel-refil', label: 'Fuel Refil', count: 2, Icon: Fuel, color: 'text-green-500' },
    { id: 'fuel-drainage', label: 'Fuel Drainage', count: 1, Icon: Droplets, color: 'text-red-500' },
  ],
  addonAlerts: [
    { id: 'tank-lid', label: 'Tank Lid Alert', count: 0, Icon: Box, color: 'text-cyan-500' },
    { id: 'temperature', label: 'Temperature Alert', count: 1, Icon: Thermometer, color: 'text-blue-500' },
  ],
};

// Monthly Aggregates for Report Page
const calculateMonthlyTotal = (field: keyof (typeof dailyRecords)[0], monthOffset: number) => {
  const monthStart = startOfDay(subDays(today, 30 * monthOffset + 30));
  const monthEnd = startOfDay(subDays(today, 30 * monthOffset));
  return dailyRecords
    .filter(r => {
      const rDate = new Date(r.date);
      return isWithinInterval(rDate, { start: monthStart, end: monthEnd });
    })
    .reduce((sum, r) => sum + (r[field] as number || 0), 0);
};

const lastMonthHours = calculateMonthlyTotal('workingHours', 1);
const prevMonthHours = calculateMonthlyTotal('workingHours', 2);
const lastMonthFuel = calculateMonthlyTotal('fuelConsumed', 1);
const prevMonthFuel = calculateMonthlyTotal('fuelConsumed', 2);

export const monthlyStats = [
  {
    title: 'Total Working Hours', value: lastMonthHours.toFixed(1), unit: 'Hrs',
    change: ((lastMonthHours - prevMonthHours) / prevMonthHours) * 100,
    previousValue: prevMonthHours.toFixed(1), Icon: Clock,
  },
  {
    title: 'Total Fuel Consumed', value: lastMonthFuel.toFixed(0), unit: 'L',
    change: ((lastMonthFuel - prevMonthFuel) / prevMonthFuel) * 100,
    previousValue: prevMonthFuel.toFixed(0), Icon: Gauge,
  },
  {
    title: 'Avg. Efficiency', value: (lastMonthHours / lastMonthFuel).toFixed(2), unit: 'Hrs/L',
    change: 2.5, previousValue: ((prevMonthHours / prevMonthFuel).toFixed(2)), Icon: Gauge,
  },
];

export const performanceMetrics = [
  { parameter: 'Total Fuel Consumption (L)', july: prevMonthFuel, august: lastMonthFuel, change: lastMonthFuel - prevMonthFuel, percentChange: ((lastMonthFuel - prevMonthFuel) / prevMonthFuel) * 100 },
  { parameter: 'Total Working Hours', july: prevMonthHours, august: lastMonthHours, change: lastMonthHours - prevMonthHours, percentChange: ((lastMonthHours - prevMonthHours) / prevMonthHours) * 100 },
];


// --- LEGACY & MISC DATA (to prevent breaking components) ---
export type DashboardItem = { id: string; component: string; className: string; title: string; icon?: LucideIcon; value?: string; change?: string; };
export const dashboardItems: DashboardItem[] = [];
export const vehicleStatusPieData = {
  today: [
    { name: 'Moving', value: 28, color: '#22c55e' },
    { name: 'Idle', value: 5, color: '#f59e0b' },
    { name: 'Parked', value: 15, color: '#f97316' },
    { name: 'Working', value: 7, color: '#3b82f6' },
    { name: 'High Speed', value: 2, color: '#ef4444' },
    { name: 'Ignition On', value: 3, color: '#a855f7' },
    { name: 'Unreachable', value: 13, color: '#6b7280' },
    { name: 'Battery Disconnected', value: 9, color: '#f59e0b' },
  ],
  yesterday: [],
  custom: [],
};

export const recentAlertsData = [
  { id: 1, vehicle: 'Van-208', alert: 'Battery Disconnected', time: '19m ago', priority: 'Low' },
  { id: 2, vehicle: 'Car-309', alert: 'Panic Alert', time: '20m ago', priority: 'Medium' },
  { id: 3, vehicle: 'Truck-105', alert: 'Panic Alert', time: '43m ago', priority: 'Low' },
  { id: 4, vehicle: 'Truck-119', alert: 'Battery Disconnected', time: '36m ago', priority: 'High' },
  { id: 5, vehicle: 'Van-217', alert: 'Panic Alert', time: '39m ago', priority: 'Medium' },
  { id: 6, vehicle: 'Car-305', alert: 'Geofence Exit', time: '51m ago', priority: 'Critical' },
  { id: 7, vehicle: 'Excavator-02', alert: 'High Engine Temp', time: '55m ago', priority: 'High' },
  { id: 8, vehicle: 'Loader-07', alert: 'Low Fuel', time: '1h ago', priority: 'Medium' },
];

export const stoppageData = [
  { vehicle: 'Truck-101', stoppage: 2.2, overstoppage: 0.4 },
  { vehicle: 'Van-202', stoppage: 2.6, overstoppage: 0.3 },
  { vehicle: 'Car-302', stoppage: 1.5, overstoppage: 0.2 },
  { vehicle: 'Truck-102', stoppage: 3.1, overstoppage: 0.6 },
  { vehicle: 'Van-204', stoppage: 2.8, overstoppage: 0.3 },
  { vehicle: 'Car-303', stoppage: 1.1, overstoppage: 0.1 },
  { vehicle: 'Truck-103', stoppage: 1.0, overstoppage: 0 },
  { vehicle: 'Van-203', stoppage: 1.8, overstoppage: 0.3 },
  { vehicle: 'Car-304', stoppage: 1.2, overstoppage: 0.7 },
  { vehicle: 'Truck-104', stoppage: 3.5, overstoppage: 0.9 },
  { vehicle: 'Truck-105', stoppage: 2.8, overstoppage: 0.4 },
  { vehicle: 'Van-205', stoppage: 2.1, overstoppage: 0.2 },
  { vehicle: 'Car-305', stoppage: 1.3, overstoppage: 0.3 },
];