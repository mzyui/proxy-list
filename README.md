
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

> Scraper found **4330** proxies at the latest update. Usable proxies are below.

## Usage

Click the file format that you want and copy the URL.

|File|Content|Count|
|----|-------|-----|
|[data.txt](https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.txt)|`ip_address:port` combined (seperated new line)|204|
|[data.json](https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.json)|`ip, port`|204|
|[data-with-geolocation.json](https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data-with-geolocation.json)|`ip, port, geolocation`|204|

## Sources

|Source|Found Proxies|Succeed|
|------|-------------|-------|
|[free-proxy-list.net](https://free-proxy-list.net)|300|✅|
|[us-proxy.org](https://www.us-proxy.org)|200|✅|
|[proxydb.net](http://proxydb.net)|15|✅|
|[free-proxy-list.com](https://free-proxy-list.com/?page=&port=&type%5B%5D=http&type%5B%5D=https&up_time=0&search=Search)|10|✅|
|[proxy-list.download](https://www.proxy-list.download/HTTP)|26|✅|
|[vpnoverview.com](https://vpnoverview.com/privacy/anonymous-browsing/free-proxy-servers)|32|✅|
|[proxyscan.io](https://www.proxyscan.io)|0|🚫|
|[proxylist.geonode.com](https://proxylist.geonode.com/api/proxy-list?limit=300&page=1&sort_by=lastChecked&sort_type=desc&protocols=http,https)|300|✅|
|[proxyscrape.com](https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all)|533|✅|
|[github.com/clarketm/proxy-list](https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt)|400|✅|
|[github.com/monosans/proxy-list](https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt)|290|✅|
|[github.com/TheSpeedX/PROXY-List](https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt)|2224|✅|


## Sample Proxies With Geolocation Info

|#|Ip|Port|Country|City|Internet Service Provider|
|-|--|----|-------|----|-------------------------|
|1|104.131.19.48|3128|United States|Clifton|DigitalOcean, LLC|
|2|76.72.138.48|3128|United States|Easton|Easton Utilities Commission|
|3|104.131.19.48|3128|United States|Clifton|DigitalOcean, LLC|
|4|156.34.187.155|8888|Canada|Dartmouth|Bell Canada|
|5|92.205.22.114|38080|France|Strasbourg|GD MASS Network|
|6|45.167.126.78|3128|Colombia|Popayán|Sepcom Comunicaciones SAS|
|7|157.100.12.138|999|Ecuador|Loja|Telconet S.A|
|8|134.238.252.143|8080|India|Mumbai|Google LLC|
|9|147.139.4.105|3128|India|Mumbai|Alibaba.com LLC|
|10|133.242.171.216|3128|Japan|Chiyoda|SAKURA Internet Inc.|
|11|112.140.186.124|808|Singapore|Singapore|Sparkstation Pte Ltd|
|12|64.225.97.57|8080|Germany|Frankfurt am Main|DigitalOcean, LLC|
|13|51.159.115.233|3128|France|Paris|SCALEWAY|
|14|138.117.110.87|999|Colombia|Cartago|Media Commerce Partners S.A|
|15|115.96.208.124|8080|India|Mumbai|Hathway IP over Cable Internet Access|
|16|43.154.69.42|3128|Hong Kong|Hong Kong|Shenzhen Tencent Computer Systems Company Limited|
|17|80.252.5.34|7001|Poland|Warsaw|GWNET Autonomus System|
|18|177.53.152.138|999|Peru|Lima|Moreno Yanoc Nemias Bernardo|
|19|195.225.232.3|8085|Iran|Tehran|TS Information Technology Limited|
|20|198.52.241.12|999|France|Paris|OSNET Wireless|



## Contributing

Contributions are welcome, and they are greatly appreciated! Every
little bit helps, and credit will always be given.

