"""File / upload helpers: Cloudinary-aware storage, upload paths, public URL building.

Modules in this subpackage all deal with user-uploaded media:

* ``storage`` — resilient Cloudinary backend (graceful 503 on outage).
* ``upload_paths`` — callable ``upload_to`` helpers for ID-based naming.
* ``file_urls`` — turn a ``FieldFile`` into a browser-resolvable absolute URL.
"""
