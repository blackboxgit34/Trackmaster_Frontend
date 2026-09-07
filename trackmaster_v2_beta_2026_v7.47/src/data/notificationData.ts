import { format, subDays, subHours, subMinutes } from 'date-fns';
import { actualVehicles } from './mockData';

export const messageTypes = [
  'Complaint', 'Daily SMS', 'Fuel Lid', 'Fuel Theft', 'Geofence', 'POI In', 'POI Out',
  'IgnitionOn', 'Immobiliser Done', 'Immobiliser Request', 'Main Battery Disconnection',
  'Ac On Idling', 'Geofence Out', 'Fuel Rod disconnection', 'Dirt In Fuel Tank',
  'Continuous Driving', 'No Driving Hours', 'MilkLid', 'On Demand Location SMS',
  'Over-speed', 'OverStoppage', 'Stoppage', 'Idling'
] as const;

export const notificationTypes = [
  { id: "0", label: "All Alerts" },
  { id: "1", label: "SMS Sent" },
  { id: "2", label: "Push Notifications" },
  { id: "3", label: "Email Sent" },
  { id: "4", label: "WhatsApp Sent" },
  { id: "5", label: "Delivery Failures" },
  { id: "6", label: "User Offline (Logged Out Everywhere)" },
];

export type DeliveryStatus =
  | 'Delivered'
  | 'Sent'
  | 'No Credits'
  | 'Technical Error'
  | 'Failed'
  | 'NA';

export const deliveryStatuses = [
  'Delivered',
  'Sent',
  'No Credits',
  'Technical Error',
  'Failed',
  'NA',
] as const;

export interface NotificationData {
  id: number;
  vehicleId: string;
  vehicleName: string;
  messageDate: string;
  messageType: string;
  message: string;

  // External Contact Destinations
  mobileNumbers?: string[];
  mobile: string;
  whatsappNumbers?: string[];
  whatsapp?: string;
  emailAddresses?: string[];
  email?: string;

  // Delivery Reach across Channels
  smsStatus: DeliveryStatus;
  whatsappStatus: DeliveryStatus;
  emailStatus: DeliveryStatus;
  pushStatus: 'Delivered' | 'Sent' | 'Failed' | 'NA';

  // User Logged-in Presence at time of Alert
  androidLoggedIn: boolean;
  iosLoggedIn: boolean;
  webLoggedIn: boolean;

  // Legacy compatibility
  androidStatus: string;
  iosStatus: string;
  notificationType: string;
}

const generateNotifications = (): NotificationData[] => {
  const notifications: NotificationData[] = [];
  let idCounter = 1;
  const now = new Date();

  actualVehicles.slice(0, 30).forEach((vehicle, vehicleIndex) => {
    const numNotifications = Math.floor(Math.random() * 5) + 3; // 3-7 notifications per vehicle

    for (let i = 0; i < numNotifications; i++) {
      const messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
      const date = subMinutes(subHours(subDays(now, i), vehicleIndex), Math.random() * 60 * 12);

      let message = '';
      switch (messageType) {
        case 'Over-speed':
          message = `Vehicle ${vehicle.name} exceeded speed limit (95 km/h) at NH-48 Highway.`;
          break;
        case 'IgnitionOn':
          message = `Ignition ON detected for vehicle ${vehicle.name}.`;
          break;
        case 'Geofence':
          message = `Geofence breach: Vehicle ${vehicle.name} entered Warehouse Zone 4.`;
          break;
        case 'Fuel Theft':
          message = `Potential fuel drop/theft detected for ${vehicle.name}. Sudden decrease of 18L.`;
          break;
        case 'Main Battery Disconnection':
          message = `Main battery disconnection warning triggered on vehicle ${vehicle.name}.`;
          break;
        default:
          message = `Alert: ${messageType} triggered for vehicle ${vehicle.name}.`;
      }

      // If vehicleIndex % 7 === 0, simulate missing number/subscription ("Insufficient Credits")
      const hasNumbers = vehicleIndex % 7 !== 0;
      const countNumbers = hasNumbers ? ((vehicleIndex + i) % 4) + 1 : 0;

      const mobileNumbers: string[] = [];
      for (let n = 1; n <= countNumbers; n++) {
        mobileNumbers.push(`+91 98765 ${String(vehicleIndex * 10 + n).padStart(5, '0')}`);
      }

      // WhatsApp numbers can match or be subset of mobile numbers
      const whatsappNumbers = [...mobileNumbers];

      // If vehicleIndex % 5 === 0, simulate missing email ("Mail not added")
      const hasEmail = vehicleIndex % 5 !== 0;
      const emailAddress = hasEmail ? `fleet.manager${(vehicleIndex % 4) + 1}@trackmaster.in` : '';
      const emailAddresses = hasEmail ? [emailAddress] : [];

      // Channel delivery logic:
      // Case 1: Active subscription/credits -> Delivered (~75%)
      // Case 2: Inactive subscription or exhausted credits -> No Credits (~18%)
      // Case 3: Rare technical error -> Technical Error (~5%)
      // Case 4: In transit -> Sent (~2%)
      const getSmsWhatsappStatus = (hasRecipient: boolean): DeliveryStatus => {
        if (!hasRecipient) return 'No Credits';
        const rand = Math.random();
        if (rand < 0.72) return 'Delivered';
        if (rand < 0.92) return 'No Credits'; // Subscription/credits exhausted
        if (rand < 0.97) return 'Technical Error'; // Rare telecom gateway error
        return 'Sent';
      };

      const smsStatus: DeliveryStatus = getSmsWhatsappStatus(mobileNumbers.length > 0);
      const whatsappStatus: DeliveryStatus = getSmsWhatsappStatus(whatsappNumbers.length > 0);

      // Email delivery logic (free for everyone, no subscription needed):
      // Delivered (~97%) or rare Technical Error (~3%)
      const emailStatus: DeliveryStatus = !emailAddress
        ? 'NA'
        : Math.random() < 0.97
          ? 'Delivered'
          : 'Technical Error';

      const pushStatus: 'Delivered' | 'Sent' | 'Failed' | 'NA' =
        Math.random() < 0.95 ? 'Delivered' : 'Failed';

      const androidLoggedIn = Math.random() > 0.35;
      const iosLoggedIn = Math.random() > 0.6;
      const webLoggedIn = Math.random() > 0.4;

      notifications.push({
        id: idCounter++,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        messageDate: format(date, 'yyyy-MM-dd HH:mm'),
        messageType,
        message,
        mobileNumbers,
        mobile: mobileNumbers.join(', '),
        whatsappNumbers,
        whatsapp: whatsappNumbers.join(', '),
        emailAddresses,
        email: emailAddress || undefined,

        smsStatus,
        whatsappStatus,
        emailStatus,
        pushStatus,

        androidLoggedIn,
        iosLoggedIn,
        webLoggedIn,

        androidStatus: pushStatus,
        iosStatus: pushStatus,
        notificationType: 'Multi-Channel Alert',
      });
    }
  });

  return notifications;
};

export const notificationData = generateNotifications();