"""
agencies/onboarding_serializers.py
------------------------------------
Partner (İşletme) onboarding — stepper akışı için serializer'lar.

Üç aşama:
  1. OnboardingStartSerializer   — Adım 1: hesap + işletme türü (User + Agency
     birlikte, atomic — bkz. agencies/onboarding_views.py)
  2. AgencyOnboardingStepSerializer — Adım 2-5: partial PATCH, her istekte
     sadece o adımın alanları gönderilir. Format validasyonu burada (VKN/TCKN,
     IBAN, telefon, dosya boyutu/tipi) — cross-field zorunluluk YOK (kullanıcı
     henüz tüm adımları tamamlamamış olabilir).
  3. AgencyOnboardingSubmitSerializer — Adım 6: nihai gönderim. TÜM zorunlu
     alanları ve KOŞULLU TÜRSAB zorunluluğunu çapraz kontrol eder — asıl
     güvenlik burada, frontend'e asla güvenilmez.
"""
import re

from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Agency

PHONE_RE = re.compile(r'^(\+90|0)?5\d{9}$')
VKN_RE = re.compile(r'^\d{10}$')
TCKN_RE = re.compile(r'^\d{11}$')
IBAN_RE = re.compile(r'^TR\d{24}$')
MERSIS_RE = re.compile(r'^\d{16}$')

MAX_LOGO_MB = 5
MAX_DOCUMENT_MB = 10
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
ALLOWED_DOCUMENT_TYPES = {'application/pdf', 'image/jpeg', 'image/png'}


def _validate_file(value, max_mb, allowed_types, label):
    if value.size > max_mb * 1024 * 1024:
        raise serializers.ValidationError(f'{label} {max_mb}MB sınırını aşıyor.')
    content_type = getattr(value, 'content_type', None)
    if content_type and content_type not in allowed_types:
        raise serializers.ValidationError(f'{label} için geçersiz dosya türü.')
    return value


BASE_REQUIRED_FIELDS = {
    'name': 'İşletme adı',
    'tax_id': 'Vergi Kimlik No / TCKN',
    'tax_office': 'Vergi dairesi',
    'logo': 'İşletme logosu',
    'description': 'İşletme açıklaması',
    'city': 'Şehir',
    'address': 'İşletme adresi',
    'iban': 'IBAN',
    'bank_account_holder': 'Hesap sahibi',
    'bank_name': 'Banka adı',
}

# TÜRSAB yalnız seyahat acentası tarafında zorunlu; restoran/kafe muaf.
TURSAB_REQUIRED_FIELDS = {
    'tursab_no': 'TÜRSAB İşletme Belgesi Numarası',
    'tursab_group': 'Acenta grubu',
    'tursab_document': 'TÜRSAB İşletme Belgesi',
}

TURSAB_BUSINESS_TYPES = ('acenta', 'her_ikisi')


def collect_missing_fields(agency):
    """
    Başvurunun gönderilebilmesi için eksik olan alanları
    `{alan_adı: kullanıcıya gösterilecek mesaj}` biçiminde döner.

    Hem nihai gönderim doğrulaması (`AgencyOnboardingSubmitSerializer`) hem de
    panelin "eksik bilgi" ekranı bu tek kaynağı kullanır — ikisi ayrışırsa
    kullanıcıya eksik gösterilmeyen bir alan yüzünden gönderim reddedilir.
    """
    missing = {}

    for field, label in BASE_REQUIRED_FIELDS.items():
        if not getattr(agency, field, None):
            missing[field] = f'{label} zorunludur.'

    if agency.legal_entity_type == 'company' and not agency.trade_registry_document:
        missing['trade_registry_document'] = 'Şirketler için ticaret sicil belgesi zorunludur.'

    if agency.description and len(agency.description) < 50:
        missing['description'] = 'İşletme açıklaması en az 50 karakter olmalıdır.'

    if agency.business_type in TURSAB_BUSINESS_TYPES:
        for field, label in TURSAB_REQUIRED_FIELDS.items():
            if not getattr(agency, field, None):
                missing[field] = f'{label} seyahat acentaları için zorunludur.'

    return missing


class OnboardingStartSerializer(serializers.Serializer):
    """Adım 1 — Hesap & İşletme Türü. User + Agency'yi birlikte oluşturur."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    contact_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=30)
    business_type = serializers.ChoiceField(choices=Agency.BUSINESS_TYPE_CHOICES)
    legal_entity_type = serializers.ChoiceField(choices=Agency.LEGAL_ENTITY_CHOICES)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Bu e-posta adresi zaten kullanılıyor.')
        return value

    def validate_phone(self, value):
        if not PHONE_RE.match(value.replace(' ', '')):
            raise serializers.ValidationError('Geçerli bir telefon numarası girin (örn. 05XXXXXXXXX).')
        return value


class AgencyOnboardingStepSerializer(serializers.ModelSerializer):
    """Adım 2-5 — partial PATCH, tek seferde sadece ilgili adımın alanları."""

    class Meta:
        model = Agency
        fields = [
            # Adım 2 — Yasal & Vergi
            'name', 'tax_id', 'tax_office', 'mersis_no', 'trade_registry_document',
            # Adım 3 — TÜRSAB (koşullu)
            'tursab_no', 'tursab_group', 'tursab_document',
            # Adım 4 — İşletme Profili
            'logo', 'cover_image', 'description', 'city', 'district', 'address',
            # Adım 5 — Finans
            'iban', 'bank_account_holder', 'bank_name',
            # Onboarding ilerlemesi
            'onboarding_step',
        ]

    def validate_tax_id(self, value):
        if not value:
            return value
        agency = self.instance
        is_company = agency and agency.legal_entity_type == 'company'
        pattern = VKN_RE if is_company else TCKN_RE
        expected = '10 haneli' if is_company else '11 haneli'
        if not pattern.match(value):
            raise serializers.ValidationError(
                f'{"Vergi Kimlik Numarası" if is_company else "TCKN"} {expected} olmalıdır.'
            )
        return value

    def validate_mersis_no(self, value):
        if value and not MERSIS_RE.match(value):
            raise serializers.ValidationError('MERSİS numarası 16 haneli olmalıdır.')
        return value

    def validate_iban(self, value):
        if not value:
            return value
        cleaned = value.replace(' ', '').upper()
        if not IBAN_RE.match(cleaned):
            raise serializers.ValidationError('IBAN, TR ile başlayıp toplam 26 karakter (TR + 24 hane) olmalıdır.')
        return cleaned

    def validate_logo(self, value):
        return _validate_file(value, MAX_LOGO_MB, ALLOWED_IMAGE_TYPES, 'Logo')

    def validate_cover_image(self, value):
        return _validate_file(value, MAX_LOGO_MB, ALLOWED_IMAGE_TYPES, 'Kapak fotoğrafı')

    def validate_tursab_document(self, value):
        return _validate_file(value, MAX_DOCUMENT_MB, ALLOWED_DOCUMENT_TYPES, 'TÜRSAB belgesi')

    def validate_trade_registry_document(self, value):
        return _validate_file(value, MAX_DOCUMENT_MB, ALLOWED_DOCUMENT_TYPES, 'Ticaret sicil belgesi')


class AgencyOnboardingSubmitSerializer(serializers.ModelSerializer):
    """
    Adım 6 — nihai gönderim. Tüm önceki adımların zorunlu alanlarını
    çapraz kontrol eder (asıl güvenlik — frontend'e asla güvenilmez) ve
    sözleşme/KVKK onay checkbox'larını bekler.
    """
    accept_contract = serializers.BooleanField(write_only=True)
    accept_kvkk = serializers.BooleanField(write_only=True)

    class Meta:
        model = Agency
        fields = ['accept_contract', 'accept_kvkk']

    def validate_accept_contract(self, value):
        if not value:
            raise serializers.ValidationError('Sözleşmeyi kabul etmeniz gerekmektedir.')
        return value

    def validate_accept_kvkk(self, value):
        if not value:
            raise serializers.ValidationError('KVKK aydınlatma metnini onaylamanız gerekmektedir.')
        return value

    def validate(self, data):
        errors = collect_missing_fields(self.instance)
        if errors:
            raise serializers.ValidationError(errors)
        return data
