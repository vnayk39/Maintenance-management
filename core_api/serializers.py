from rest_framework import serializers
from decimal import Decimal
import json
from .models import MaintenanceDataRe, PayLogRe, SpacewiseCharges, MaintenanceDataNew

class SpacewiseChargesSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpacewiseCharges
        fields ='__all__'

class MaintenanceDataReSerializer(serializers.ModelSerializer):
    """
    Serializer for the MaintenanceData model.
    Handles converting MaintenanceData instances to/from JSON.
    """
    class Meta:
        model = MaintenanceDataRe
        fields = '__all__' # Include all fields from the MaintenanceData model

class PayLogReSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayLogRe
        fields = '__all__'

def get_parking_data_from_space_type(space_type_instance):
        if space_type_instance:
                return space_type_instance.parking
        return {}

class MaintenanceDataNewSerializer(serializers.ModelSerializer):
    """
    Serializer for the MaintenanceDataNew model.

    This version correctly calculates and includes 'parking' charges in the
    final 'total'. The logic is centralized in the `validate()` method to
    ensure the values are persisted to the database on both create and update.
    """
    class Meta:
        model = MaintenanceDataNew
        fields = '__all__'
        read_only_fields = ['total']
    
    def validate(self, data):
        """
        This method runs for both create and update operations.
        It handles all the necessary calculations before the data is saved.
        All numerical values are converted to Decimal to prevent the TypeError.
        """
        # Get the current or updated instance data. Use getattr for safe access.
        space_type_instance = data.get('space_type', getattr(self.instance, 'space_type', None))
        apply_lease_rent = data.get('apply_lease_rent', getattr(self.instance, 'apply_lease_rent', False))
        num_of_vehicles = data.get('num_of_vehicles', getattr(self.instance, 'num_of_vehicles', 0))
        parking_data = get_parking_data_from_space_type(space_type_instance)

        # --- Fix for TypeError: Convert all numbers to Decimal ---
        data['periodic_building_maintenance'] = Decimal(data.get('periodic_building_maintenance', 0))
        data['repair_and_maintenance_fund'] = Decimal(data.get('repair_and_maintenance_fund', 0))
        data['sinking_funds'] = Decimal(data.get('sinking_funds', 0))
        data['lease_rent'] = Decimal(data.get('lease_rent', 0))
        data['penalty'] = Decimal(data.get('penalty', 0))
        data['balance'] = Decimal(data.get('balance', 0))
        data['parking'] = Decimal('0.00')

        if 'space_type' in data and space_type_instance:
            data['periodic_building_maintenance'] = space_type_instance.periodic_building_maintenance
            data['repair_and_maintenance_fund'] = space_type_instance.repair_and_maintenance_fund
            data['sinking_funds'] = space_type_instance.sinking_funds

            if apply_lease_rent:
                data['lease_rent'] = space_type_instance.lease_rent
            else:
                data['lease_rent'] = Decimal('0.00')

            if parking_data:
                data['parking'] = parking_data.get(str(num_of_vehicles), Decimal('0.00'))
        
        data['total'] = (
            data.get('periodic_building_maintenance', Decimal('0.00')) +
            data.get('repair_and_maintenance_fund', Decimal('0.00')) +
            data.get('sinking_funds', Decimal('0.00')) +
            data.get('lease_rent', Decimal('0.00')) +
            data.get('parking',  Decimal('0.00')) +
            ##data['parking'] +
            data.get('penalty', Decimal('0.00')) +
            data.get('balance', Decimal('0.00'))
        )
        
        return data

    def create(self, validated_data):
        return super().create(validated_data)

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)
    



