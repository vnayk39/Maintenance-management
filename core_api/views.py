from rest_framework.decorators import api_view, action
from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import MaintenanceDataRe, PayLogRe, SpacewiseCharges, MaintenanceDataNew
from .serializers import MaintenanceDataReSerializer, PayLogReSerializer, SpacewiseChargesSerializer, MaintenanceDataNewSerializer
import re
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated

# def index(request):
#     return render(request, 'index.html')
# def charges(request):
#     return render(request, 'charges.html')
# def paylog(request):
#     return render(request, 'paylog.html')
# def paylogview(request):
#     return render(request, 'paylog_view.html')
def home(request):
    return render(request, 'home.html')

# Create your views here.
class SpacewiseChargesViewSet(viewsets.ModelViewSet):
    queryset = SpacewiseCharges.objects.all()
    serializer_class = SpacewiseChargesSerializer
    filter_backends = [DjangoFilterBackend] 
    filterset_fields = ['space_type'] 
    
    def create(self, request, *args, **kwargs):
        if isinstance(request.data, list): # This checks for batch data
            serializer = self.get_serializer(data=request.data, many=True) # And processes it as a batch
        else:
            serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

     
class MaintenanceDataReViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceDataRe.objects.all()
    serializer_class = MaintenanceDataReSerializer
    filter_backends = [DjangoFilterBackend] 
    filterset_fields = ['room'] 

class PayLogReViewset(viewsets.ModelViewSet):
    queryset = PayLogRe.objects.all()
    serializer_class = PayLogReSerializer

    def create(self, request, *args, **kwargs):
        if isinstance(request.data, list): # This checks for batch data
            serializer = self.get_serializer(data=request.data, many=True) # And processes it as a batch
        else:
            serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    


class MaintenanceDataNewViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceDataNew.objects.all()
    serializer_class = MaintenanceDataNewSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['room', 'space_type'] # Allow filtering by room and space_type (ID)
    #permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        if isinstance(request.data, list):
            serializer = self.get_serializer(data=request.data, many=True)
        else:
            serializer = self.get_serializer(data=request.data)
        
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)


@api_view(['GET'])
def get_owners(request):
     owners = MaintenanceDataRe.objects.all()
     serializer = MaintenanceDataReSerializer(owners, many=True)
     return Response(serializer.data)

@api_view(['POST'])
def create(request):
        serializer = MaintenanceDataReSerializer(data=request.data, many=True)
        if serializer.is_valid():
              serializer.save()
              return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

