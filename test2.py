import requests

url = "https://api.sectors.app/v2/historical/BBCA/"

headers = {"Authorization": "9cf087104aa9d63c4f53c50e0de6c382460e244ea8bd3b01c171cf3691ba21d3"}

response = requests.get(url, headers=headers)

print(response.text)
