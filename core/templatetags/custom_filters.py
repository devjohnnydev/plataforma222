from django import template

register = template.Library()


@register.filter
def dict_get(d, key):
    """Allow dictionary access in templates: {{ my_dict|dict_get:key }}"""
    if not isinstance(d, dict):
        return None
    return d.get(key)


@register.filter
def split(value, delimiter=','):
    """Split a string by delimiter: {{ 'a,b,c'|split:',' }}"""
    return value.split(delimiter)
