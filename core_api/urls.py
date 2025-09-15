from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import MaintenanceDataReViewSet, PayLogReViewset, SpacewiseChargesViewSet, MaintenanceDataNewViewSet,get_owners, create

router = DefaultRouter()
router.register(r'maintenance-data', MaintenanceDataReViewSet) # Endpoint will be /api/maintenance-data/
router.register(r'pay-log', PayLogReViewset)
router.register(r'charges', SpacewiseChargesViewSet)
router.register(r'maintenance-data-new', MaintenanceDataNewViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('', views.home, name='home'),
    # path('charges/', views.charges, name='charges'),
    # path('paylog/', views.charges, name='paylog'),
    # path('paylogview/', views.charges, name='paylogview'),
    path('owners/', get_owners, name='get_owners'),  
    path('post_owners/', create, name='post_owners'),
    ]