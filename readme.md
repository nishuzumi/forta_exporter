## Forta Exporter for Prometheus

Env: Nodejs,Pm2

And you need install git
```
sudo apt update
sudo apt install git -y
git clone https://github.com/nishuzumi/forta_exporter.git
cd forta_exporter
yarn install
pm2 start --name forta_exporter index.js
```

Default Port is 9889


### use by docker
```
node="$(forta account address 2>&1)"
docker run --name forta-exporter -p 9889:9889 -itd -e SCAN_ADDR=$node 108356037/forta-exporter:v1
```