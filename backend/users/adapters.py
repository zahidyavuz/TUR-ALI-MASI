from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings

from core.emails import frontend_url


class FrontendAccountAdapter(DefaultAccountAdapter):
    """
    allauth'un ürettiği bağlantıları ön yüze yönlendirir.

    Varsayılan davranış `account_confirm_email` url'ini backend üzerinde çözer;
    kullanıcıya gönderilen bağlantı bu yüzden bir API ucunu gösteriyordu ve
    tarayıcıda açıldığında işe yaramıyordu. Ön yüzdeki /verify-email sayfası
    `key` parametresini okuyup doğrulama isteğini kendisi atıyor.
    """

    def get_email_confirmation_url(self, request, emailconfirmation):
        return frontend_url('/verify-email', key=emailconfirmation.key)

    def send_mail(self, template_prefix, email, context):
        # allauth şablonları marka adı için `current_site`'a bakar; Site kaydı
        # kurulumda güncellenmediği sürece bu "example.com" olur. Marka adı
        # ayardan gelsin ki e-postalarda örnek alan adı görünmesin.
        context.setdefault('site_name', settings.SITE_NAME)
        return super().send_mail(template_prefix, email, context)
