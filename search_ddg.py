import urllib.request
import json
import re

def search_ddg_image(query):
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        # find the first image url from duckduckgo html page
        matches = re.findall(r'<img class="tile--img__img".*?src="//external-content\.duckduckgo\.com/iu/\?u=(.*?)&amp;f=1"', html)
        if matches:
            return urllib.parse.unquote(matches[0])
        # alternative regex
        matches = re.findall(r'src="//external-content\.duckduckgo\.com/iu/\?u=(.*?)&', html)
        if matches:
            return urllib.parse.unquote(matches[0])
            
        return html[:500]
    except Exception as e:
        return str(e)

print("Balloon:", search_ddg_image("hot air balloon cappadocia unsplash"))
print("ATV:", search_ddg_image("atv tour cappadocia unsplash"))
print("Horse:", search_ddg_image("horse riding cappadocia unsplash"))
