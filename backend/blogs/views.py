from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from .models import Blog, Tag
from .serializers import BlogSerializer, TagSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly
import django_filters


class BlogFilter(django_filters.FilterSet):
    tag = django_filters.CharFilter(field_name='tags__slug')
    category = django_filters.CharFilter(field_name='category')

    class Meta:
        model = Blog
        fields = ['category', 'tag']


class BlogViewSet(viewsets.ModelViewSet):
    serializer_class = BlogSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_class = BlogFilter

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def get_queryset(self):
        # Anonymous/non-staff users only see published blogs
        if self.request.user.is_staff:
            return Blog.objects.prefetch_related('tags').all()
        return Blog.objects.prefetch_related('tags').filter(status='published')


class TagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    pagination_class = None
