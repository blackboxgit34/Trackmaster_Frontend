import { useParams } from 'react-router-dom';
import {
  Fuel,
  Thermometer,
  AirVent,
  Clock,
  FileText,
  Box,
  ShieldAlert,
  ArrowUpCircle,
  BarChart,
  Camera,
  Radio,
  Video,
} from 'lucide-react';
import UnderConstruction from '@/components/page/UnderConstruction';
import NotFound from '@/components/page/NotFound';
import FuelReportsPage from './addons/FuelReportsPage';

const addonNav = [
  { name: 'Fuel Reports', href: 'fuel-reports', icon: Fuel },
  { name: 'Refrigerator Temp.', href: 'refrigerator-temp', icon: Thermometer, component: <UnderConstruction pageName="Refrigerator Temp." /> },
  { name: 'AC On/Off', href: 'ac-on-off', icon: AirVent, component: <UnderConstruction pageName="AC On/Off" /> },
  { name: 'Engine Working Hours', href: 'engine-working-hours', icon: Clock, component: <UnderConstruction pageName="Engine Working Hours" /> },
  { name: 'Thresher Working Hours', href: 'thresher-working-hours', icon: Clock, component: <UnderConstruction pageName="Thresher Working Hours" /> },
  { name: 'Door Report', href: 'door-report', icon: FileText, component: <UnderConstruction pageName="Door Report" /> },
  { name: 'Lid Report', href: 'lid-report', icon: Box, component: <UnderConstruction pageName="Lid Report" /> },
  { name: 'Panic Report', href: 'panic-report', icon: ShieldAlert, component: <UnderConstruction pageName="Panic Report" /> },
  { name: 'Dumper Tilt Report', href: 'dumper-tilt-report', icon: ArrowUpCircle, component: <UnderConstruction pageName="Dumper Tilt Report" /> },
  { name: 'Tilt Angle Report', href: 'tilt-angle-report', icon: BarChart, component: <UnderConstruction pageName="Tilt Angle Report" /> },
  { name: 'Camera Images', href: 'camera-images', icon: Camera, component: <UnderConstruction pageName="Camera Images" /> },
  { name: 'RFID Report', href: 'rfid-report', icon: Radio, component: <UnderConstruction pageName="RFID Report" /> },
  { name: 'MDVR Streaming', href: 'mdvr-streaming', icon: Video, component: <UnderConstruction pageName="MDVR Streaming" /> },
];

const AddonsPage = () => {
  const params = useParams();

  const subpage = params.subpage || 'fuel-reports';
  const reportType = params.reportType;

  const activeNavItem = addonNav.find(nav => nav.href === subpage);

  if (!activeNavItem) {
    return <NotFound />;
  }

  if (activeNavItem.href === 'fuel-reports') {
    return <FuelReportsPage activeTab={reportType || 'fuel-analysis'} />;
  }

  return (
    <div className="w-full">
      <div className="px-6 bg-card border-b">
        <h1 className="text-2xl font-bold tracking-tight text-foreground py-4">{activeNavItem.name}</h1>
      </div>
      <div className="p-6">{activeNavItem.component}</div>
    </div>
  );
};

export default AddonsPage;