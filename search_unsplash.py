import urllib.request
import re

def get_unsplash_id(query):
    url = f"https://unsplash.com/s/photos/{query.replace(' ', '-')}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        # Find first image ID
        matches = re.findall(r'https://images\.unsplash\.com/photo-([a-zA-Z0-9\-]+)\?', html)
        if matches:
            return matches[0]
        return None
    except Exception as e:
        return str(e)

print("Balloon:", get_unsplash_id("hot air balloon cappadocia"))
print("ATV:", get_unsplash_id("atv quad bike"))
print("Horse:", get_unsplash_id("horse riding trail"))
