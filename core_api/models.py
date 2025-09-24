from django.db import models
from datetime import date
# Create your models here.

class SpacewiseCharges(models.Model):
    space_type = models.CharField(max_length=10, help_text="Space")
    periodic_building_maintenance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Periodic building maintenance")
    repair_and_maintenance_fund = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Repair and maintenance fund")
    sinking_funds = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Sinking funds")
    lease_rent = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Lease rent")
    parking = models.JSONField(default=dict)
    additional_charges = models.JSONField(default=dict)

    class Meta:
        verbose_name = "Spacewise Maintenance Charges"
        verbose_name_plural = "Spacewise Maintenance Charges"
        ordering = ['id'] 
    
    def __str__(self):
        return f"For {self.space_type} - PBM: {self.periodic_building_maintenance}, -RMF: {self.repair_and_maintenance_fund}, -Sinking funds: {self.sinking_funds}"
    
class MaintenanceDataRe(models.Model):
    room = models.CharField(max_length=50, unique=True, help_text="room number (e.g., A-101)")
    owners = models.CharField(max_length=255, help_text="Owners of the room")
    space = models.CharField(max_length=10, help_text="Space")
    periodic_building_maintenance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Periodic building maintenance")
    repair_and_maintenance_fund = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Repair and maintenance fund")
    sinking_funds = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Sinking funds")
    parking = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Parking charges")
    penalty = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Penalty charges (if any)")
    lease_rent = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Lease rent")
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="balance")
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="balance")
    
    class Meta:
        verbose_name = "Maintenance Data Entry"
        verbose_name_plural = "Maintenance Data Entries"
        ordering = ['id'] 

    def __str__(self):
        return f"Room {self.room} - Owners: {self.owners}"
    
class MaintenanceDataNew(models.Model):
    room = models.CharField(max_length=50, unique=True, help_text="Unique room number (e.g., A-101)")
    owners = models.CharField(max_length=255, help_text="Owners of the room")
    # Link to SpacewiseCharges for base rates
    space_type = models.ForeignKey(SpacewiseCharges, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='maintenance_entries', help_text="Select the space type to auto-fill charges")

    # Individual charges (these will be populated from SpacewiseCharges, but can be overridden if needed)
    # They are not ForeignKeys because they store the *value* at the time of entry, not a reference.
    space_type_val = models.CharField(max_length=10, blank=True, null=True)
    periodic_building_maintenance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Periodic building maintenance")
    repair_and_maintenance_fund = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Repair and maintenance fund")
    sinking_funds = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Sinking funds")
    additional_charges = models.JSONField(default=dict)
    lease_rent = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Lease rent Charge")
    apply_lease_rent = models.BooleanField(default=False, help_text="Apply lease rent for this room?")
    num_of_vehicles = models.IntegerField(default=0, help_text="Number of vehicles(0 for no parking)")
    parking = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    # Room-specific charges
    penalty = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Room-specific penalty charges (if any)")
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Room-specific outstanding balance")
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Calculated total amount for this room")

    class Meta:
        verbose_name = "Room Maintenance Entry"
        verbose_name_plural = "Room Maintenance Entries"
        ordering = ['id']
    
    def __str__(self):
        return f"Room {self.room} - Owners: {self.owners}"

class PayLogRe(models.Model):
    room_no = models.CharField(max_length=50, default="", help_text="Room number") 
    owners = models.CharField(max_length=255, default="", help_text="Owners")
    date_made = models.DateField(default=date.today, help_text="Date of receipt")
    months = models.IntegerField(default=1, help_text="Number of months covered") 
    period = models.TextField(max_length=255, default="", help_text="Period covered (e.g., AUG-SEP 2024)")
    space = models.CharField(max_length=50, default="", help_text="Space (e.g., 1BHK, 2BHK)")
    periodic_building_maintenance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Periodic Building Maintenance")
    repair_and_maintenance_fund = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Repair and Maintenance Fund")
    sinking_funds = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Sinking Funds")
    parking = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Parking charges")
    penalty = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Penalty")
    lease_rent = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Lease Rent")
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Balance pending or Advance")
    total_maintenance_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Total maintenance amount")
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Amount paid")
    payment_date = models.DateField(default=date.today, help_text="Date the payment was made")
    payment_mode = models.CharField(max_length=50, default="", help_text="Mode of payment") 
    cheque_num = models.IntegerField(default=0, help_text="Cheque Number")
    cheque_draw_date = models.DateField(default=date.today, null=True, help_text="Cheque Draw date")
    description = models.TextField(blank=True, null=True, default="", help_text="Any Notes")
    
    class Meta:
        verbose_name = "Pay Log"
        verbose_name_plural = "Pay Logs"
        ordering = ['-payment_date', '-date_made'] 

    def __str__(self):
        return f"Payment for Room {self.room_no} - {self.payment_amount} on {self.payment_date}"

