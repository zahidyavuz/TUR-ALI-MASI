import re
import socket
import ipaddress
from urllib.parse import urlparse
import requests
from django.core.exceptions import ValidationError

# ─── SSRF-AND-INTERNAL-NETWORK-MASKING ──────────────────────────────────────────
# Onaylı Dış Servisler (Allowlist)
# Sunucunun sadece bu domainlere istek atmasına izin verilir.
ALLOWED_DOMAINS = [
    'api.stripe.com',
    'api.iyzipay.com',
    'api.paytr.com',
    'maps.googleapis.com',
    'storage.googleapis.com',
    's3.amazonaws.com',
    'images.unsplash.com',
    'upload.wikimedia.org',
]

# Yasaklı İç IP Blokları
# Private Network, Loopback ve Cloud Metadata IP'leri
FORBIDDEN_NETWORKS = [
    ipaddress.ip_network('127.0.0.0/8'),      # Loopback
    ipaddress.ip_network('10.0.0.0/8'),       # Private Class A
    ipaddress.ip_network('172.16.0.0/12'),    # Private Class B
    ipaddress.ip_network('192.168.0.0/16'),   # Private Class C
    ipaddress.ip_network('169.254.169.254/32'), # Cloud Metadata (AWS/GCP/Azure)
    ipaddress.ip_network('::1/128'),          # IPv6 Loopback
    ipaddress.ip_network('fe80::/10'),        # IPv6 Link-Local
]

def is_safe_url(url):
    """
    Bir URL'nin SSRF açısından güvenli olup olmadığını doğrular.
    """
    if not url:
        return False
        
    try:
        parsed = urlparse(url)
        
        # Sadece HTTP ve HTTPS izin ver (file://, gopher://, ftp:// engelle)
        if parsed.scheme not in ['http', 'https']:
            return False
            
        hostname = parsed.hostname
        if not hostname:
            return False
            
        # 1. Allowlist Kontrolü
        if hostname not in ALLOWED_DOMAINS:
            # Opsiyonel: Eğer alt domain desteği gerekiyorsa regex kullanılabilir
            is_subdomain = any(hostname.endswith('.' + domain) for domain in ALLOWED_DOMAINS)
            if not is_subdomain:
                return False
        
        # 2. IP Adresi Çözümleme ve İç Ağ Kontrolü (DNS Rebinding Koruması)
        try:
            ip_address = socket.gethostbyname(hostname)
            ip_obj = ipaddress.ip_address(ip_address)
            
            for network in FORBIDDEN_NETWORKS:
                if ip_obj in network:
                    return False
        except socket.gaierror:
            # Host çözülemiyorsa riskli olabilir
            return False
            
        return True
    except Exception:
        return False

def safe_requests_get(url, **kwargs):
    """
    Sadece güvenli URL'lere istek atan 'requests.get' sarmalayıcısı.
    """
    if not is_safe_url(url):
        raise ValidationError(f"SSRF Alert: Güvenli olmayan URL engellendi: {url}")
        
    return requests.get(url, **kwargs)

def safe_requests_post(url, **kwargs):
    """
    Sadece güvenli URL'lere istek atan 'requests.post' sarmalayıcısı.
    """
    if not is_safe_url(url):
        raise ValidationError(f"SSRF Alert: Güvenli olmayan URL engellendi: {url}")
        
    return requests.post(url, **kwargs)
