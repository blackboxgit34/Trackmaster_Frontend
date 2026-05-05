import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/Api';
import VehicleStatus from './widgets/VehicleStatus';
import VehicleUtilization from './widgets/VehicleUtilization';
import SpeedAnalysis from './widgets/SpeedAnalysis';
import GpsDeviceStatus from './widgets/GpsDeviceStatus';
import StoppageChart from './widgets/StoppageChart';
import AvgSpeedVsOverspeed from './widgets/AvgSpeedVsOverspeed';
import IdlingDuration from './widgets/IdlingDuration';
import ComplianceStatus from './widgets/ComplianceStatus';
import RecentAlerts from './widgets/RecentAlerts';
import SystemAlerts from './widgets/SystemAlerts';
import DistanceCovered from './widgets/DistanceCovered';
import AverageUptime from './widgets/AverageUptime';

const VehicleAnalysisDashboard = () => {
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const auth = JSON.parse(localStorage.getItem("trackmaster-auth") || "{}");
        const custId = auth.custId;

        const url = `${API_BASE_URL}/Dashboard/dashboarddata?userid=${custId}`;

        const res = await fetch(url);
        const result = await res.json();

        if (result.isSuccess) {
          setDashboardData(result); // 👈 directly assign
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);
  if (loading || !dashboardData) return <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-4 rounded-lg flex items-center gap-3 shadow-lg">
      <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
      <span>Please wait...</span>
    </div>
  </div>;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-4">
      <div className="lg:col-span-12">
        <VehicleStatus data={dashboardData.vehicleStatus} />
      </div>
      <div className="lg:col-span-4">
        <VehicleUtilization data={dashboardData.vehicleUtilization} />
      </div>
      <div className="lg:col-span-4">
        <SpeedAnalysis data={dashboardData.speedAnalysis} />
      </div>
      <div className="lg:col-span-4">
        <GpsDeviceStatus />
      </div>
      <div className="lg:col-span-4">
        <AvgSpeedVsOverspeed />
      </div>
      <div className="lg:col-span-4">
        <StoppageChart />
      </div>
      <div className="lg:col-span-4">
        <IdlingDuration />
      </div>
      <div className="lg:col-span-4">
        <AverageUptime />
      </div>
      <div className="lg:col-span-8">
        <DistanceCovered />
      </div>
      <div className="lg:col-span-8 flex flex-col gap-4">
        <ComplianceStatus />
        <RecentAlerts />
      </div>
      <div className="lg:col-span-4 flex">
        <SystemAlerts />
      </div>
    </div>
  );
};

export default VehicleAnalysisDashboard;