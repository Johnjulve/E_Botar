"""
Lazy Streaming Pipeline Engine for high-efficiency CSV data exports.

Leverages Python generators (yield) and Django StreamingHttpResponse
to eliminate holding arrays and maintain a flat O(1) server memory footprint.
"""
import csv
from django.http import StreamingHttpResponse


from rest_framework.renderers import BaseRenderer


class CSVRenderer(BaseRenderer):
    """Minimal renderer so DRF content negotiation cleanly accepts `format=csv` queries."""
    media_type = 'text/csv'
    format = 'csv'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class EchoBuffer:
    """An in-memory file-like buffer that returns written string chunks directly to the generator."""

    def write(self, value):
        return value


def stream_csv_response(row_generator, filename, include_bom=True):
    """
    Wrap an iterable or generator of row sequences into a StreamingHttpResponse.

    Args:
        row_generator: Generator yielding row lists or tuples [col1, col2, ...]
        filename: Name of the attachment file (e.g. 'export.csv')
        include_bom: Prepend UTF-8 BOM ('\\ufeff') for Excel UTF-8 compatibility
    """
    buffer = EchoBuffer()
    writer = csv.writer(buffer)

    def pipeline():
        if include_bom:
            yield '\ufeff'
        for row in row_generator:
            yield writer.writerow(row)

    response = StreamingHttpResponse(pipeline(), content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
