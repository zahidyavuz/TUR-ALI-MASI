from django.db import models
from django.contrib.auth.models import User


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True, max_length=50)

    def __str__(self):
        return self.name


class Blog(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Taslak'),
        ('published', 'Yayında'),
    ]

    slug = models.SlugField(primary_key=True, max_length=100)
    title = models.CharField(max_length=255)
    excerpt = models.TextField()
    content = models.TextField()
    cover_image = models.ImageField(upload_to='blogs/covers/', blank=True, null=True)
    published_at = models.DateField(auto_now_add=True)
    reading_time = models.CharField(max_length=50)  # e.g. "4 dk"
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')

    # Keep legacy fields for backward compat
    author_name = models.CharField(max_length=255, blank=True, null=True)
    author_role = models.CharField(max_length=255, blank=True, null=True)
    author_avatar = models.ImageField(upload_to='blogs/avatars/', blank=True, null=True)
    # New author FK
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='blog_posts')

    category = models.CharField(max_length=100)
    tags = models.ManyToManyField(Tag, blank=True, related_name='blogs')
    related_tour_slug = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['-published_at']

    def __str__(self):
        return self.title
