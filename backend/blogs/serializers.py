from rest_framework import serializers
from .models import Blog, Tag


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']


class BlogSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    author_display = serializers.SerializerMethodField()

    class Meta:
        model = Blog
        fields = '__all__'

    def get_author_display(self, obj):
        if obj.author:
            return {
                'name': f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.username,
                'role': obj.author_role or '',
            }
        return {
            'name': obj.author_name or 'Anonim',
            'role': obj.author_role or '',
        }
