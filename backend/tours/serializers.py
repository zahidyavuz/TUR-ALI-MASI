from rest_framework import serializers
from .models import Tour, TourItinerary, Category, TourAvailability, Combo
from agencies.serializers import AgencySerializer, MenuSerializer


class SmartImageField(serializers.ImageField):
    """
    If the stored filename looks like an external URL (starts with http),
    return that URL directly instead of prepending /media/.
    """
    def to_representation(self, value):
        if not value:
            return None
        name = value.name if hasattr(value, 'name') else str(value)
        if name.startswith('http://') or name.startswith('https://') or name.startswith('https%3A'):
            if name.startswith('https%3A'):
                name = name.replace('https%3A', 'https:', 1)
            if name.startswith('http%3A'):
                name = name.replace('http%3A', 'http:', 1)
            name = name.replace('%2F', '/')
            if name.startswith('https:/') and not name.startswith('https://'):
                name = name.replace('https:/', 'https://', 1)
            if name.startswith('http:/') and not name.startswith('http://'):
                name = name.replace('http:/', 'http://', 1)
            return name
        return super().to_representation(value)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'description']


class TourItinerarySerializer(serializers.ModelSerializer):
    class Meta:
        model = TourItinerary
        fields = ['id', 'day', 'title', 'description']


class TourAvailabilitySerializer(serializers.ModelSerializer):
    remaining = serializers.ReadOnlyField()
    is_available = serializers.ReadOnlyField()

    class Meta:
        model = TourAvailability
        fields = [
            'id', 'date', 'max_capacity', 'booked_count', 'remaining', 'is_available',
            'price_override', 'is_closed',
        ]


class TourListSerializer(serializers.ModelSerializer):
    image_main = SmartImageField()
    category_detail = CategorySerializer(source='category_obj', read_only=True)

    class Meta:
        model = Tour
        fields = [
            'id', 'title', 'location', 'rating', 'reviews_count',
            'original_price', 'price', 'discount', 'duration',
            'image_main', 'category', 'category_detail', 'fomo_count',
            'cancellation_policy',
        ]


class AgencyTourListSerializer(TourListSerializer):
    """
    Acenta panelindeki envanter listesi.

    Genel listeden farkı: bugünden itibaren açık olan kontenjan slotlarının
    toplamı (doluluk özeti) ve yayın durumu eklenir. Toplamlar view'daki
    annotate'ten gelir (bkz. AgencyTourViewSet.get_queryset).
    """
    capacity_total = serializers.IntegerField(read_only=True)
    booked_total = serializers.IntegerField(read_only=True)
    is_published = serializers.SerializerMethodField()

    class Meta(TourListSerializer.Meta):
        fields = TourListSerializer.Meta.fields + [
            'description', 'guide', 'capacity_total', 'booked_total', 'is_published',
        ]

    def get_is_published(self, obj) -> bool:
        """
        Görseli olmayan tur genel listede gösterilmez (bkz. TourViewSet),
        dolayısıyla "taslak" sayılır. Durum türetilmiştir — ayrı bir bayrak
        tutulmaz ki panelde gösterilen durum ile gerçek görünürlük ayrışmasın.
        """
        return bool(obj.image_main)


class ComboSerializer(serializers.ModelSerializer):
    """
    Vitrin + detay için küratörlü paket. Fiyat alanları (original/bundle/savings)
    modelin sunucu-tarafı hesaplayıcılarından türetilir; istemci fiyatı asla
    kabul edilmez (satın alma anında da sunucuda yeniden doğrulanır).
    """
    tour = TourListSerializer(read_only=True)
    tour_availability = TourAvailabilitySerializer(source='tour.availability_slots', many=True, read_only=True)
    menu = MenuSerializer(read_only=True)
    original_price = serializers.DecimalField(source='original_unit_price', max_digits=10, decimal_places=2, read_only=True)
    bundle_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    savings = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Combo
        fields = [
            'id', 'title', 'description', 'discount_rate', 'is_active',
            'tour', 'menu', 'tour_availability',
            'original_price', 'bundle_price', 'savings',
        ]


class TourDetailSerializer(serializers.ModelSerializer):
    agency = AgencySerializer(read_only=True)
    itinerary_steps = TourItinerarySerializer(many=True, read_only=True)
    availability_slots = TourAvailabilitySerializer(many=True, read_only=True)
    category_detail = CategorySerializer(source='category_obj', read_only=True)
    # Görseller ayrı bir uçtan (`upload-image`) yükleniyor; burada zorunlu
    # olmamalılar. `required=False` verilmezse DRF açıkça bildirilen bu
    # alanları model'deki blank/null'a bakmaksızın zorunlu sayar ve tur
    # oluşturmak imkânsız hale gelir.
    image_main = SmartImageField(required=False)
    image_sub1 = SmartImageField(required=False, allow_null=True)
    image_sub2 = SmartImageField(required=False, allow_null=True)

    class Meta:
        model = Tour
        fields = '__all__'
        # `id` slug PK'dir ve sunucuda başlıktan üretilir (bkz.
        # AgencyTourViewSet.perform_create). Puan/yorum/FOMO sayaçları
        # sosyal kanıt alanlarıdır; acentanın kendi turuna 5.0 puan veya
        # 9999 yorum yazabilmesi müşteriyi yanıltır.
        read_only_fields = ['id', 'rating', 'reviews_count', 'fomo_count']
