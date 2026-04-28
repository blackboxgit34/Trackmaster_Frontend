import { format, subDays, subHours, subMinutes } from 'date-fns';
import { actualVehicles } from './mockData';

export const messageTypes = [
  'Complaint', 'Daily SMS', 'Fuel Lid', 'Fuel Theft', 'Geofence', 'POI In', 'POI Out',
  'IgnitionOn', 'Immobiliser Done', 'Immobiliser Request', 'Main Battery Disconnection',
  'Ac On Idling', 'Geofence Out', 'Fuel Rod disconnection', 'Dirt In Fuel Tank',
  'Continuous Driving', 'No Driving Hours', 'MilkLid', 'On Demand Location SMS',
  'Over-speed', 'OverStoppage', 'Stoppage', 'Idling'
] as const;

export const notificationTypes = ['SMS', 'In-App'] as const;
export const deliveryStatuses = ['Sent', 'Delivered', 'Failed', 'Read'] as const;

export interface NotificationData {
  id: string;
  vehicleId: string;
  vehicleName: string;
  messageDate: string;
  messageType: typeof messageTypes[number];
  notificationType: typeof notificationTypes[number];
  mobile: string;
  message: string;
  androidStatus: typeof deliveryStatuses[number];
  iosStatus: typeof deliveryStatuses[number];
}

const generateNotifications = (): NotificationData[] => {
  const notifications: NotificationData[] = [];
  let idCounter = 1;
  const now = new Date();

  actualVehicles.slice(0, 30).forEach((vehicle, vehicleIndex) => {
    const numNotifications = Math.floor(Math.random() * 5) + 2; // 2-6 notifications per vehicle

    for (let i = 0; i < numNotifications; i++) {
      const messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
      const notificationType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      const date = subMinutes(subHours(subDays(now, i), vehicleIndex), Math.random() * 60 * 12);

      let message = '';
      switch (messageType) {
        case 'Over-speed':
          message = `Vehicle ${vehicle.name} is over-speeding at 95 km/h.`;
          break;
        case 'IgnitionOn':
          message = `Ignition ON for vehicle ${vehicle.name}.`;
          break;
        case 'Geofence':
          message = `Vehicle ${vehicle.name} has entered Mumbai Site A.`;
          break;
        case 'Fuel Theft':
          message = `Potential fuel theft detected for ${vehicle.name}. Level dropped by 15L.`;
          break;
        default:
          message = `Alert: ${messageType} for vehicle ${vehicle.name}.`;
      }

      notifications.push({
        id: `notif-${idCounter++}`,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        messageDate: format(date, 'yyyy-MM-dd HH:mm'),
        messageType,
        notificationType,
        mobile: notificationType === 'SMS' ? `+9198765432${String(vehicleIndex).padStart(2, '0')}` : '-',
        message,
        androidStatus: deliveryStatuses[Math.floor(Math.random() * deliveryStatuses.length)],
        iosStatus: deliveryStatuses[Math.floor(Math.random() * deliveryStatuses.length)],
      });
    }
  });

  return notifications;
};

export const notificationData = generateNotifications();