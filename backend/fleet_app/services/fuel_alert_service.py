from collections import defaultdict
from django.db.models import Count
from django.utils import timezone
from rest_framework.exceptions import NotFound
from fleet_app.models import FuelAlert

# 实测油耗超过档案油耗 15% 触发
ALERT_THRESHOLD_PERCENT = 15.0


def _serialize(alert):
    return {
        'id': alert.id,
        'vehicleId': alert.vehicle_id,
        'previousRefuelId': alert.previous_refuel_id,
        'currentRefuelId': alert.current_refuel_id,
        'previousRefuel': alert.previous_refuel,
        'currentRefuel': alert.current_refuel,
        'measuredConsumption': round(alert.measured_consumption, 1),
        'baselineConsumption': round(alert.baseline_consumption, 1),
        'increasePercent': round(alert.increase_percent, 1),
        'status': alert.status,
        'reason': alert.reason,
        'inspector': alert.inspector,
        'createdAt': alert.created_at.isoformat() if alert.created_at else None,
        'closedAt': alert.closed_at.isoformat() if alert.closed_at else None,
    }


def _group_records():
    # 延迟导入，避免与各 service 产生循环依赖
    from fleet_app.services.vehicle_service import list_vehicles
    from fleet_app.services.fuel_analytics_service import list_fuel_records
    baselines = {v['id']: v['fuelConsumption'] for v in list_vehicles()}
    grouped = defaultdict(list)
    for record in list_fuel_records():
        grouped[record['vehicleId']].append(record)
    for records in grouped.values():
        records.sort(key=lambda r: (r['date'], r['mileage']))
    return baselines, grouped


def scan_fuel_anomalies():
    """按相邻两次加油核算百公里油耗，超档案油耗 15% 生成待核查记录。

    以 (vehicle, 上一次加油, 本次加油) 作为幂等键：重复扫描不会重复生成，
    已关闭的记录不会被重新打开；新出现的异常照常生成。
    """
    baselines, grouped = _group_records()
    created = []
    for vehicle_id, records in grouped.items():
        baseline = baselines.get(vehicle_id)
        if not baseline:
            continue
        for previous, current in zip(records, records[1:]):
            distance = current['mileage'] - previous['mileage']
            if distance <= 0:
                continue
            measured = current['liters'] / distance * 100
            increase_percent = (measured - baseline) / baseline * 100
            if increase_percent <= ALERT_THRESHOLD_PERCENT:
                continue
            alert, was_created = FuelAlert.objects.get_or_create(
                vehicle_id=vehicle_id,
                previous_refuel_id=previous['id'],
                current_refuel_id=current['id'],
                defaults={
                    'previous_refuel': previous,
                    'current_refuel': current,
                    'measured_consumption': measured,
                    'baseline_consumption': baseline,
                    'increase_percent': increase_percent,
                },
            )
            if was_created:
                created.append(alert)
    return [_serialize(alert) for alert in created]


def list_fuel_alerts(status=None):
    queryset = FuelAlert.objects.all().order_by('-created_at', '-id')
    if status:
        queryset = queryset.filter(status=status)
    return [_serialize(alert) for alert in queryset]


def close_fuel_alert(alert_id, reason, inspector=''):
    try:
        alert = FuelAlert.objects.get(id=alert_id)
    except FuelAlert.DoesNotExist:
        raise NotFound('待核查记录不存在')
    # 已关闭的记录重复提交直接返回，保证幂等
    if alert.status != FuelAlert.ALERT_CLOSED:
        alert.status = FuelAlert.ALERT_CLOSED
        alert.reason = reason
        alert.inspector = inspector
        alert.closed_at = timezone.now()
        alert.save(update_fields=['status', 'reason', 'inspector', 'closed_at'])
    return _serialize(alert)


def open_alert_counts():
    """返回 {vehicle_id: 未关闭数量}，供车辆卡片展示。"""
    rows = (FuelAlert.objects.filter(status=FuelAlert.ALERT_OPEN)
            .values('vehicle_id').annotate(count=Count('id')))
    return {row['vehicle_id']: row['count'] for row in rows}
