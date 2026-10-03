from django.urls import path
from .integration_views import (
    IntegrationHealthView,
    IntegrationElectionListView,
    IntegrationElectionResultsView,
    IntegrationReceiptVerifyView,
)

app_name = 'integration'

urlpatterns = [
    path('health/', IntegrationHealthView.as_view(), name='health'),
    path('elections/', IntegrationElectionListView.as_view(), name='elections'),
    path('elections/<int:election_id>/results/', IntegrationElectionResultsView.as_view(), name='election-results'),
    path('verify-receipt/', IntegrationReceiptVerifyView.as_view(), name='verify-receipt'),
]
