from rest_framework import serializers

class FuelAlertCloseSerializer(serializers.Serializer):
    reason = serializers.CharField(allow_blank=False, trim_whitespace=True)
    closedBy = serializers.CharField(required=False, default='核查员')
