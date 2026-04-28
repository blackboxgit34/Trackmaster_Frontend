import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VehicleAnalysisDashboard from './VehicleAnalysisDashboard';
import FleetManagementDashboard from '@/pages/dashboards/FleetManagementDashboard';
import DrivingBehaviourDashboard from '@/pages/dashboards/DrivingBehaviourDashboard';
import ETATrackingDashboard from '@/pages/dashboards/ETATrackingDashboard';
import EVReportsDashboard from '@/pages/dashboards/EVReportsDashboard';
import CANReportsDashboard from '@/pages/dashboards/CANReportsDashboard';
import CustomiseReportDashboard from '@/pages/dashboards/CustomiseReportDashboard';

const DashboardTabs = () => {
  const triggerStyle = "pb-3 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-orange rounded-none";
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('vehicle-analysis');

  const handleTabChange = (value: string) => {
    if (value === 'fuel-analysis') {
      navigate('/addons/fuel-reports/fuel-analysis');
    } else {
      setActiveTab(value);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="px-6 bg-card border-b">
        <div className="flex items-baseline gap-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground py-2">Dashboard</h1>
          <TabsList className="bg-transparent p-0 gap-2 h-auto">
            <TabsTrigger value="vehicle-analysis" className={triggerStyle}>Vehicle Analysis</TabsTrigger>
            <TabsTrigger value="fleet-management" className={triggerStyle}>Fleet Management</TabsTrigger>
            <TabsTrigger value="fuel-analysis" className={triggerStyle}>Fuel Analysis</TabsTrigger>
            <TabsTrigger value="driving-behaviour" className={triggerStyle}>Driving Behaviour</TabsTrigger>
            <TabsTrigger value="eta-tracking" className={triggerStyle}>ETA Tracking</TabsTrigger>
            <TabsTrigger value="ev-reports" className={triggerStyle}>EV Reports</TabsTrigger>
            <TabsTrigger value="can-reports" className={triggerStyle}>CAN Reports</TabsTrigger>
            <TabsTrigger value="customise-report" className={triggerStyle}>Customise Report</TabsTrigger>
          </TabsList>
        </div>
      </div>
      <div className="p-6">
        <TabsContent value="vehicle-analysis">
          <VehicleAnalysisDashboard />
        </TabsContent>
        <TabsContent value="fleet-management">
          <FleetManagementDashboard />
        </TabsContent>
        <TabsContent value="driving-behaviour">
          <DrivingBehaviourDashboard />
        </TabsContent>
        <TabsContent value="eta-tracking">
          <ETATrackingDashboard />
        </TabsContent>
        <TabsContent value="ev-reports">
          <EVReportsDashboard />
        </TabsContent>
        <TabsContent value="can-reports">
          <CANReportsDashboard />
        </TabsContent>
        <TabsContent value="customise-report">
          <CustomiseReportDashboard />
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default DashboardTabs;