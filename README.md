
# Free HTTP Proxy List 🌍

[![Every 10 Minutes Update](https://github.com/mertguvencli/http-proxy-list/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/mertguvencli/http-proxy-list/actions/workflows/main.yml)
![GitHub](https://img.shields.io/github/license/mertguvencli/http-proxy-list)
![GitHub last commit](https://img.shields.io/github/last-commit/mertguvencli/http-proxy-list)
[![zevtyardt - proxy-list](https://img.shields.io/static/v1?label=zevtyardt&message=proxy-list&color=blue&logo=github)](https://github.com/zevtyardt/proxy-list "Go to GitHub repo")
[![stars - proxy-list](https://img.shields.io/github/stars/zevtyardt/proxy-list?style=social)](https://github.com/zevtyardt/proxy-list)
[![forks - proxy-list](https://img.shields.io/github/forks/zevtyardt/proxy-list?style=social)](https://github.com/zevtyardt/proxy-list)
[![Proxy Updater](https://github.com/zevtyardt/proxy-list/workflows/Proxy%20Updater/badge.svg)](https://github.com/zevtyardt/proxy-list/actions?query=workflow:"Proxy+Updater")
![GitHub repo size](https://img.shields.io/github/repo-size/zevtyardt/proxy-list)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/zevtyardt/proxy-list?logo=commits)](https://github.com/zevtyardt/proxy-list/commits/main)

It is a lightweight project that, every 10 minutes, scrapes lots of free-proxy sites, validates if it works, and serves a clean proxy list.

> Scraper found **6039** proxies at the latest update. Usable proxies are below.

## Usage

Click the file format that you want and copy the URL.

|File|Content|Count|
|----|-------|-----|
|[data.txt](https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.txt)|`ip_address:port` combined (seperated new line)|518|
|[data.json](https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.json)|`ip, port`|518|
|[data-with-geolocation.json](https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data-with-geolocation.json)|`ip, port, geolocation`|518|

## Sources

|Source|Found Proxies|Succeed|
|------|-------------|-------|
|[free-proxy-list.net](https://free-proxy-list.net)|300|✅|
|[us-proxy.org](https://www.us-proxy.org)|200|✅|
|[proxydb.net](http://proxydb.net)|15|✅|
|[free-proxy-list.com](https://free-proxy-list.com/?page=&port=&type%5B%5D=http&type%5B%5D=https&up_time=0&search=Search)|10|✅|
|[proxy-list.download](https://www.proxy-list.download/HTTP)|26|✅|
|[vpnoverview.com](https://vpnoverview.com/privacy/anonymous-browsing/free-proxy-servers)|32|✅|
|[proxyscan.io](https://www.proxyscan.io)|100|✅|
|[proxylist.geonode.com](https://proxylist.geonode.com/api/proxy-list?limit=300&page=1&sort_by=lastChecked&sort_type=desc&protocols=http,https)|0|🚫|
|[proxyscrape.com](https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all)|1390|✅|
|[github.com/clarketm/proxy-list](https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt)|400|✅|
|[github.com/monosans/proxy-list](https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt)|820|✅|
|[github.com/TheSpeedX/PROXY-List](https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt)|2746|✅|


## Sample Proxies With Geolocation Info

|#|Ip|Port|Country|City|Internet Service Provider|
|-|--|----|-------|----|-------------------------|
|1|104.223.135.178|10000|United States|Los Angeles|LayerHost|
|2|205.185.126.246|3128|United States|Las Vegas|FranTech Solutions|
|3|47.243.167.134|8889|Hong Kong|Central|Alibaba (US) Technology Co., Ltd.|
|4|185.198.61.146|3128|Italy|Milan|Global Router LLC|
|5|51.159.115.233|3128|France|Paris|SCALEWAY|
|6|45.8.179.241|1337|United Kingdom|London|Hostland LLC|
|7|20.210.26.214|3128|Japan|Tokyo|Microsoft Corporation|
|8|205.185.126.246|3128|United States|Las Vegas|FranTech Solutions|
|9|47.243.55.21|8080|Hong Kong|Central|Alibaba (US) Technology Co., Ltd.|
|10|199.192.20.70|3128|United States|New York|Namecheap, Inc.|
|11|141.147.158.11|8080|Japan|Osaka|Oracle Corporation|
|12|199.192.20.70|3128|United States|New York|Namecheap, Inc.|
|13|157.90.196.188|3128|Germany|Falkenstein|Hetzner Online GmbH|
|14|80.252.5.34|7001|Poland|Warsaw|GWNET Autonomus System|
|15|161.77.218.163|3129|United States|Springfield|Crocker Communications|
|16|92.62.141.219|3128|Lithuania|Kaunas|UAB "Baltnetos komunikacijos"|
|17|202.181.14.23|3128|Bangladesh|Dhaka|BDPEER|
|18|49.0.2.242|8090|Indonesia|Bogor|PT Usaha Adi Sanggoro|
|19|91.206.15.125|3128|Russia|Moscow|OOO "Network of data-centers "Selectel"|
|20|201.229.250.19|8080|Dominican Republic|Santiago de los Caballeros|Compañía Dominicana de Teléfonos S. A.|



## Contributing

Contributions are welcome, and they are greatly appreciated! Every
little bit helps, and credit will always be given.

