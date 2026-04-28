import ManagePoiTable from './ManagePoiTable';
import type { Poi } from '@/data/poiData';

interface ManagePoiProps {
  pois: Poi[];
  onUpdatePois: (pois: Poi[]) => void;
}

const ManagePoi = ({ pois, onUpdatePois }: ManagePoiProps) => {
  return <ManagePoiTable pois={pois} onUpdatePois={onUpdatePois} />;
};

export default ManagePoi;