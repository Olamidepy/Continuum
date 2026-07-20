const fetch = require('node-fetch');
async function check() {
  const res = await fetch('https://forno.celo.org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getCode',
      params: ['0x83c247209705269Ad6FffFE23C952aa965948330', 'latest']
    })
  });
  console.log(await res.text());
}
check();
