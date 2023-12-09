import { getRelayerBalances } from "../web3/web3.ts";

Deno.serve(async (req) => {
  const relayerBalances = await getRelayerBalances();

  const page = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <section>
    <div>Relayer address: ${relayerBalances.address}</div>
    <hr/>
    <div>${relayerBalances.balances[0].name}: ${
    relayerBalances.balances[0].balance
  } ${relayerBalances.balances[0].currency} </div>
  <hr/>
  <div>${relayerBalances.balances[1].name}: ${
    relayerBalances.balances[1].balance
  } ${relayerBalances.balances[1].currency} </div>        
  
    </section>
</body>
</html>
`;
  const headers = new Headers();
  headers.append("Content-Type", "text/html; charset=UTF-8");

  return new Response(page, { status: 200, headers });
});
