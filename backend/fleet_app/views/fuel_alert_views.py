from rest_framework.decorators import api_view
from rest_framework.response import Response
from fleet_app.serializers.fuel_alert_serializer import FuelAlertCloseSerializer
from fleet_app.services.fuel_alert_service import (
    close_fuel_alert,
    list_fuel_alerts,
    scan_fuel_anomalies,
)


@api_view(['GET', 'POST'])
def fuel_alerts(request):
    if request.method == 'POST':
        # 依据最新加油记录核算异常，重复请求不重复生成
        created = scan_fuel_anomalies()
        return Response(created, status=201 if created else 200)
    return Response(list_fuel_alerts(status=request.GET.get('status')))


@api_view(['POST'])
def fuel_alert_close(request, alert_id):
    serializer = FuelAlertCloseSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    alert = close_fuel_alert(
        alert_id,
        serializer.validated_data['reason'],
        serializer.validated_data.get('inspector', ''),
    )
    return Response(alert)
