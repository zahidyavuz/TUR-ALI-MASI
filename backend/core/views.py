from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .exchange import get_exchange_rates


class ExchangeRateView(APIView):
    """
    Genel (public) günlük döviz kuru servisi (F4-03).

    TRY baz kurları döndürür; ön yüz fiyatları yalnız *gösterim* için çevirir,
    tahsilat daima TRY'dir. Kaynak TCMB, 24 saat cache'li (bkz. core.exchange).
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(get_exchange_rates())
