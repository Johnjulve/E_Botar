"""Shared DRF pagination for large list endpoints."""
from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """Default list pagination for admin tables and directories."""

    page_query_param = 'page'
    page_size_query_param = 'page_size'
    page_size = 50
    max_page_size = 100
