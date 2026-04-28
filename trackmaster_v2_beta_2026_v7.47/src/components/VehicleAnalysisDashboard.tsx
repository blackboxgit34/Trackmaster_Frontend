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
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-4">
      <div className="lg:col-span-12">
        <VehicleStatus />
      </div>
      <div className="lg:col-span-4">
        <VehicleUtilization />
      </div>
      <div className="lg:col-span-4">
        <SpeedAnalysis />
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