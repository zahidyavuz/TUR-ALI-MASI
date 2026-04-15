import urllib.request
import json
import urllib.parse

def search_wikimedia(query):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch={urllib.parse.quote(query)}&gsrlimit=5&prop=imageinfo&iiprop=url"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        response = urllib.request.urlopen(req).read().decode('utf-8')
        data = json.loads(response)
        pages = data['query']['pages']
        results = []
        for page_id in pages:
            results.append(pages[page_id]['title'] + " -> " + pages[page_id]['imageinfo'][0]['url'])
        return results
    except Exception as e:
        return [str(e)]

print("Balloon:")
for r in search_wikimedia("Hot air balloons over Cappadocia"):
    print(r)
    
print("\nATV:")
for r in search_wikimedia("ATV tour Cappadocia"):
    print(r)

print("\nATV Turkey:")
for r in search_wikimedia("ATV quad bike"):
    print(r)
    
print("\nHorse:")
for r in search_wikimedia("Horse riding Cappadocia"):
    print(r)

