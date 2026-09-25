from rest_framework.decorators import api_view
from rest_framework.response import Response
from fleet_app.services.fuel_alert_service import open_alert_count_by_vehicle
from fleet_app.services.vehicle_service import list_vehicles
@api_view(['GET'])
def vehicles(request):
    data = list_vehicles()
    counts = open_alert_count_by_vehicle()
    for vehicle in data:
        vehicle['openFuelAlerts'] = counts.get(vehicle['id'], 0)
    return Response(data)
