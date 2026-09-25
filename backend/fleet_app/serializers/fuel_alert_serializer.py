from rest_framework import serializers


class FuelAlertCloseSerializer(serializers.Serializer):
    reason = serializers.CharField(trim_whitespace=True, min_length=1)
    inspector = serializers.CharField(required=False, allow_blank=True, default='')
