from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('agencies', '0005_agency_commission_rate_agency_is_active_and_more'),
    ]

    operations = [
        # 1. Agency'ye business_type alanı ekle
        migrations.AddField(
            model_name='agency',
            name='business_type',
            field=models.CharField(
                choices=[('acenta', 'Tur Acentası'), ('restoran', 'Restoran')],
                default='acenta',
                max_length=20,
                verbose_name='İşletme Türü',
            ),
        ),

        # 2. Menu tablosu oluştur
        migrations.CreateModel(
            name='Menu',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, verbose_name='Ürün Adı')),
                ('description', models.TextField(blank=True, null=True, verbose_name='Açıklama')),
                ('category', models.CharField(
                    choices=[
                        ('starter', 'Başlangıç'),
                        ('main', 'Ana Yemek'),
                        ('dessert', 'Tatlı'),
                        ('drink', 'İçecek'),
                        ('special', 'Günün Özel Menüsü'),
                    ],
                    default='main',
                    max_length=20,
                    verbose_name='Kategori',
                )),
                ('price', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='Fiyat (₺)')),
                ('daily_price', models.DecimalField(
                    blank=True,
                    decimal_places=2,
                    max_digits=10,
                    null=True,
                    verbose_name='Günlük Özel Fiyat (₺)',
                )),
                ('is_available', models.BooleanField(default=True, verbose_name='Mevcut mu?')),
                ('is_daily_special', models.BooleanField(default=False, verbose_name='Günün Özel Menüsü mü?')),
                ('image', models.URLField(blank=True, null=True, verbose_name='Görsel URL')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('restaurant', models.ForeignKey(
                    limit_choices_to={'business_type': 'restoran'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='menus',
                    to='agencies.agency',
                    verbose_name='Restoran',
                )),
            ],
            options={
                'verbose_name': 'Menü Kalemi',
                'verbose_name_plural': 'Menü Kalemleri',
                'ordering': ['category', 'name'],
            },
        ),

        # 3. TableReservation tablosu oluştur
        migrations.CreateModel(
            name='TableReservation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('guest_name', models.CharField(max_length=255, verbose_name='Misafir Adı')),
                ('guest_phone', models.CharField(max_length=30, verbose_name='Telefon')),
                ('guest_email', models.EmailField(blank=True, max_length=254, null=True, verbose_name='E-posta')),
                ('guest_count', models.PositiveIntegerField(default=1, verbose_name='Kişi Sayısı')),
                ('table_number', models.CharField(blank=True, max_length=20, null=True, verbose_name='Masa No')),
                ('reservation_date', models.DateField(verbose_name='Rezervasyon Tarihi')),
                ('reservation_time', models.TimeField(verbose_name='Saat')),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notlar')),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Bekliyor'),
                        ('confirmed', 'Onaylandı'),
                        ('seated', 'Masaya Alındı'),
                        ('completed', 'Tamamlandı'),
                        ('cancelled', 'İptal Edildi'),
                    ],
                    default='pending',
                    max_length=20,
                    verbose_name='Durum',
                )),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('restaurant', models.ForeignKey(
                    limit_choices_to={'business_type': 'restoran'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='table_reservations',
                    to='agencies.agency',
                    verbose_name='Restoran',
                )),
            ],
            options={
                'verbose_name': 'Masa Rezervasyonu',
                'verbose_name_plural': 'Masa Rezervasyonları',
                'ordering': ['reservation_date', 'reservation_time'],
            },
        ),
    ]
