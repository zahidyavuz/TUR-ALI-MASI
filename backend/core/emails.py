"""
İşlemsel e-posta gönderimi için tek giriş noktası.

Daha önce her çağrı yeri kendi metnini f-string ile birleştiriyordu; bu hem
markayı tutarsız kılıyor hem de bir düzeltmenin altı ayrı yerde yapılmasını
gerektiriyordu. Buradaki yardımcı, şablonları `templates/emails/` altından
render eder ve düz metin + HTML alternatifini birlikte gönderir.
"""

import logging
from urllib.parse import urlencode

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.template import TemplateDoesNotExist

logger = logging.getLogger(__name__)


def frontend_url(path='/', **query):
    """
    Ön yüzde bir sayfanın mutlak adresini üretir.

    Maillerdeki bağlantılar `Site` çerçevesine bırakılamaz: varsayılan alan adı
    example.com'dur ve istekten türetilirse backend host'unu (API) gösterir.
    """
    base = settings.FRONTEND_URL.rstrip('/')
    if not path.startswith('/'):
        path = '/' + path
    url = f'{base}{path}'
    if query:
        url = f'{url}?{urlencode(query)}'
    return url


def display_name(user):
    """E-postada hitap edilecek ad; ad soyad yoksa kullanıcı adına düşer."""
    full_name = (user.get_full_name() or '').strip()
    return full_name or user.first_name or user.username


def _base_context(extra):
    context = {
        'site_name': settings.SITE_NAME,
        'frontend_url': settings.FRONTEND_URL,
    }
    context.update(extra or {})
    return context


def send_templated_mail(template, recipient, context=None, fail_silently=True):
    """
    `emails/<template>_subject.txt`, `emails/<template>.txt` ve (varsa)
    `emails/<template>.html` şablonlarını render edip gönderir.

    Alıcı adresi boşsa hiç denenmez. `fail_silently=True` iken gönderim hatası
    çağıranın akışını bozmaz — rezervasyon oluşturuldu ama mail gitmedi durumu,
    rezervasyonun hiç oluşmamasından iyidir. Yine de sessiz kalınmaz: hata
    loglanır ve dönüş değeri False olur.
    """
    if not recipient:
        return False

    ctx = _base_context(context)

    # Konu tek satır olmalı; şablon sonundaki newline SMTP başlığını bozar.
    subject = ' '.join(render_to_string(f'emails/{template}_subject.txt', ctx).split())
    text_body = render_to_string(f'emails/{template}.txt', ctx)

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
    )
    try:
        message.attach_alternative(render_to_string(f'emails/{template}.html', ctx), 'text/html')
    except TemplateDoesNotExist:
        # HTML sürümü isteğe bağlı — düz metin her zaman gönderilir.
        pass

    try:
        message.send(fail_silently=False)
        return True
    except Exception as exc:
        logger.warning('[EMAIL] "%s" gönderilemedi (%s): %s', template, recipient, exc)
        if not fail_silently:
            raise
        return False
