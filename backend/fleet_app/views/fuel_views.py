from rest_framework.decorators import api_view
from rest_framework.response import Response
from fleet_app.serializers.fuel_alert_serializer import FuelAlertCloseSerializer
from fleet_app.services.fuel_alert_service import FuelAlertError, close_fuel_alert, list_fuel_alerts
from fleet_app.services.fuel_analytics_service import list_fuel_records

@api_view(['GET'])
def fuel_records(request):
    return Response(list_fuel_records())

@api_view(['GET'])
def fuel_alerts(request):
    return Response(list_fuel_alerts(request.query_params.get('status')))

@api_view(['POST'])
def fuel_alert_close(request, alert_id):
    serializer = FuelAlertCloseSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        alert = close_fuel_alert(alert_id, serializer.validated_data['reason'], serializer.validated_data.get('closedBy') or '核查员')
    except FuelAlertError as exc:
        return Response({'detail': str(exc)}, status=400)
    if alert is None:
        return Response({'detail': '预警不存在'}, status=404)
    return Response(alert)
