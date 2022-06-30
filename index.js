const client = require('prom-client');
const express = require('express');
const server = express();
const Registry = client.Registry;
const register = new Registry();
const cli = require('shelljs');
const fetch = require('node-fetch');
require('dotenv').config();

const getGraphInfo = async ()=>{
    return await fetch("https://explorer-api.forta.network/graphql", {
        "headers": {
          "accept": "*/*",
          "accept-language": "en,zh-CN;q=0.9,zh;q=0.8,zh-TW;q=0.7,fr;q=0.6",
          "content-type": "application/json",
          "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"102\", \"Google Chrome\";v=\"102\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"macOS\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "sec-gpc": "1"
        },
        "referrer": "https://explorer.forta.network/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": "{\"operationName\":\"Retrive\",\"variables\":{},\"query\":\"query Retrive {\\n  getChains {\\n    chainId\\n    upAgents\\n    totalAgents\\n    upScanners\\n    totalScanners\\n    __typename\\n  }\\n}\\n\"}",
        "method": "POST",
        "mode": "cors",
        "credentials": "omit"
      });
};

(async function () {
    console.log('running')
    const address = cli.exec("forta account address", { silent: true }).stderr.replace('\n', '')
    if (address.length != '42') {
        throw new Error("Can not found address")
    }
    const forta_rpc = new client.Gauge({
        name: "forta_rpc",
        help: "check forta state",
    })
    const forta_scanner = new client.Gauge({
        name: "forta_scanner",
        help: "check forta state",
    })
    const forta_supervisor = new client.Gauge({
        name: "forta_supervisor",
        help: "check forta state",
    })
    const forta_updater = new client.Gauge({
        name: "forta_updater",
        help: "check forta state",
    })

    const sla_min = new client.Gauge({
        name: "sla_min",
        help: "check sla state",
        // labelNames: ['min', 'max', 'p50', 'avg']
    })

    const sla_max = new client.Gauge({
        name: "sla_max",
        help: "check sla state",
    })

    const sla_p50 = new client.Gauge({
        name: "sla_p50",
        help: "check sla state",
    })

    const sla_avg = new client.Gauge({
        name: "sla_avg",
        help: "check sla state",
    })

    const map = {
        'forta.container.forta-json-rpc.summary':forta_rpc,
        'forta.container.forta-scanner.summary':forta_scanner,
        'forta.container.forta-supervisor.summary':forta_supervisor,
        'forta.container.forta-updater.summary':forta_updater
    }

    const slaMap = {
        'min':sla_min,
        'max':sla_max,
        'p50':sla_p50,
        'avg':sla_avg,
    }

    const nodes = {
        1:"ethereum",10:"optimism",56:"bsc",137:"polygon",250:"fantom",42161:"arbitrum",43114:"avalanche"
    }

    const chain_metric = new client.Gauge({
        name: "forta_nodes",
        help: "check sla state",
        labelNames:['chainId','name']
    })

    register.registerMetric(chain_metric)

    for(const m of Object.values(map)) register.registerMetric(m)
    for(const m of Object.values(slaMap)) register.registerMetric(m)

    const updateNode = async()=>{
        try{
            const result = await (await getGraphInfo()).json()
            const list = result['data']['getChains']
            for(const c of list){
                chain_metric.labels({chainId:c.chainId,name:nodes[c.chainId]}).set(c.totalScanners)
            }
        }catch(e){
            console.log(e)
        }
        setTimeout(updateNode,15 * 1000)
    }
    updateNode()

    setInterval(async () => {
        const result = JSON.parse(cli.exec('forta status --format json', { silent: true }).toString())
        for (const status of result) {
            map[status.name].set(status.status == 'ok'?1:0)
        }
        if(Object.keys(result) < 4){
            forta_scanner.set(1)
        }
    }, 15 * 1000)

    setInterval(async () => {
        const result = await fetch(`https://api.forta.network/stats/sla/scanner/${address}`)
        const data = (await result.json())['statistics']
        for(const [k,v] of Object.entries(data)){
            slaMap[k].set(v)
        }
    }, 15 * 1000)

    server.get('/metrics', async (req, res) => {
        try {
            res.set('Content-Type', register.contentType);
            res.end(await register.metrics());
        } catch (ex) {
            res.status(500).end(ex);
        }
    });

    const port = process.env.PORT || 9889;
    console.log(
        `Server listening to ${port}, metrics exposed on /metrics endpoint`,
    );
    server.listen(port);
})();

