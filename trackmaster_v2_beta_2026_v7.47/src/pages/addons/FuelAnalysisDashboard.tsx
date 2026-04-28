import SensorStatusWidget from '@/components/widgets/SensorStatus';
import CurrentFuelLevelChart from '@/components/widgets/CurrentFuelLevelChart';
import CurrentFuelLevel from '@/components/widgets/CurrentFuelLevel';
import Fuel from '@/components/widgets/Fuel';
import Alerts from '@/components/widgets/Alerts';

const FuelAnalysisDashboard = () => {
  return (
    <div className="space-y-4">
      <SensorStatusWidget />
      <CurrentFuelLevelChart />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-4">
        <div className="lg:col-span-3">
          <CurrentFuelLevel />
        </div>
        <div className="lg:col-span-6">
          <Fuel />
        </div>
        <div className="lg:col-span-3">
          <Alerts />
        </div>
      </div>
    </div>
  );
};

export default FuelAnalysisDashboard;