from django.http import JsonResponse
from django.db import connection


def health_check(request):
    """Simple health check endpoint for container monitoring."""
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False

    status_code = 200 if db_ok else 503
    return JsonResponse({
        'status': 'healthy' if db_ok else 'unhealthy',
        'database': 'connected' if db_ok else 'disconnected',
    }, status=status_code)
