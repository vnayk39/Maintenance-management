from django.contrib import admin
from .models import MaintenanceDataRe, PayLogRe, SpacewiseCharges, MaintenanceDataNew

# Register your models here.
admin.site.register(MaintenanceDataRe)
admin.site.register(PayLogRe)
admin.site.register(SpacewiseCharges)
admin.site.register(MaintenanceDataNew)