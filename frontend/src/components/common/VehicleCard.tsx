import { Badge, Card, Space } from 'antd';
import type { Vehicle } from '../../types';
import { StatusBadge } from './StatusBadge';
export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  return <Card size="small" title={vehicle.plateNo} extra={<Space><StatusBadge status={vehicle.status} />{vehicle.openFuelAlerts > 0 && <Badge count={vehicle.openFuelAlerts} size="small" title="未关闭油耗预警" />}</Space>}><p>{vehicle.brandModel}</p><p>{vehicle.mileage.toLocaleString()} km</p></Card>;
}
