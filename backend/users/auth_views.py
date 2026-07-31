"""Hassas kimlik uçlarına gerçek rate limiting ekleyen ince alt sınıflar.

dj_rest_auth'un `LoginView`/`RegisterView`'ları `throttle_scope` taşımaz, bu
yüzden brute-force / kayıt spam'ine karşı sınırsızdır. Burada yalnızca
`throttle_scope` set edilir; asıl oran matrisi settings.REST_FRAMEWORK
'DEFAULT_THROTTLE_RATES' altında ('login', 'register') tanımlıdır ve
'ScopedRateThrottle' DEFAULT_THROTTLE_CLASSES içinde olduğu için devreye girer.

Not: Throttle sayacı DRF cache backend'inde tutulur. Tek-süreçli LocMemCache
production'da process başına ayrıdır; dağıtık ortamda ortak bir cache
(Redis vb.) gerekir — aksi halde sınır her worker'da bağımsız işler.
"""
from dj_rest_auth.registration.views import RegisterView
from dj_rest_auth.views import LoginView


class ThrottledLoginView(LoginView):
    """IP başına dakikada 5 giriş denemesi (settings 'login' scope)."""
    throttle_scope = 'login'


class ThrottledRegisterView(RegisterView):
    """IP başına saatte 5 kayıt (settings 'register' scope)."""
    throttle_scope = 'register'
