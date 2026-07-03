from django import template
from django.urls import reverse
from django.utils.html import format_html

register = template.Library()

@register.simple_tag
def nav_link(url_name, label, current):
    active = 'text-brand-600' if url_name == current else 'text-ink-600'
    url = reverse(url_name)
    return format_html(
        '<a href="{}" class="{} hover:text-brand-600 transition-colors">{}</a>',
        url, active, label
    )
