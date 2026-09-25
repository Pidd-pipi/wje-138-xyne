from django.utils import timezone
from fleet_app.services.fuel_analytics_service import list_fuel_records
from fleet_app.services.vehicle_service import list_vehicles

# 相邻两次加油算出的百公里油耗超过车辆档案油耗该比例时生成待核查预警
FUEL_ALERT_THRESHOLD = 0.15

STATUS_PENDING = 'Pending'
STATUS_CLOSED = 'Closed'

_alerts = []
_alert_keys = set()


class FuelAlertError(Exception):
    pass


def _now():
    return timezone.localtime().strftime('%Y-%m-%d %H:%M')


def _segment_consumption(prev_record, curr_record):
    distance = curr_record['mileage'] - prev_record['mileage']
    if distance <= 0:
        return None
    return curr_record['liters'] / distance * 100


def sync_fuel_alerts():
    vehicles = {vehicle['id']: vehicle for vehicle in list_vehicles()}
    records_by_vehicle = {}
    for record in list_fuel_records():
        records_by_vehicle.setdefault(record['vehicleId'], []).append(record)
    for vehicle_id, records in records_by_vehicle.items():
        vehicle = vehicles.get(vehicle_id)
        if not vehicle or vehicle['fuelConsumption'] <= 0:
            continue
        records.sort(key=lambda item: (item['date'], item['mileage'], item['id']))
        baseline = vehicle['fuelConsumption']
        for prev_record, curr_record in zip(records, records[1:]):
            key = (vehicle_id, prev_record['id'], curr_record['id'])
            if key in _alert_keys:
                continue
            consumption = _segment_consumption(prev_record, curr_record)
            if consumption is None:
                continue
            increase_pct = (consumption - baseline) / baseline * 100
            if increase_pct <= FUEL_ALERT_THRESHOLD * 100:
                continue
            _alert_keys.add(key)
            alert_id = len(_alerts) + 1
            _alerts.append({
                'id': alert_id,
                'alertNo': f'FA-{alert_id:04d}',
                'vehicleId': vehicle_id,
                'plateNo': vehicle['plateNo'],
                'prevRecord': prev_record,
                'currRecord': curr_record,
                'segmentConsumption': round(consumption, 1),
                'baselineConsumption': baseline,
                'increasePct': round(increase_pct, 1),
                'status': STATUS_PENDING,
                'reason': '',
                'closedBy': '',
                'createdAt': _now(),
                'closedAt': None,
            })


def list_fuel_alerts(status=None):
    sync_fuel_alerts()
    alerts = sorted(_alerts, key=lambda alert: alert['id'], reverse=True)
    if status:
        alerts = [alert for alert in alerts if alert['status'] == status]
    return alerts


def close_fuel_alert(alert_id, reason, closed_by='核查员'):
    sync_fuel_alerts()
    for alert in _alerts:
        if alert['id'] == alert_id:
            if alert['status'] == STATUS_CLOSED:
                raise FuelAlertError('该预警已关闭，请勿重复操作')
            alert['status'] = STATUS_CLOSED
            alert['reason'] = reason
            alert['closedBy'] = closed_by
            alert['closedAt'] = _now()
            return alert
    return None


def open_alert_count_by_vehicle():
    sync_fuel_alerts()
    counts = {}
    for alert in _alerts:
        if alert['status'] == STATUS_PENDING:
            counts[alert['vehicleId']] = counts.get(alert['vehicleId'], 0) + 1
    return counts
