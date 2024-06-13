# DebitLlama Relayer

A Scalable Intent-Solver that solves subscription payments by for DebitLlama.
It does a simple thing, fetch payment intents and submit transactions to the network.

## Deployment

You can run it locally on your computer without depending on a cloud
service. It was developed to run on linux but other OS should also work.
It uses Deno, which must be installed to run it.

Install deno: `curl -fsSL https://deno.land/install.sh | sh`

You need `git` and clone this repository then configure the environment and run it.

Optionally it supports deployment on Deno Deploy or a VPS or dedicated servers, raspberry pi.

### ENV

These variables need to be filled out to use this relayer. put them in a `.env`
file

`RELAYER_PRIVATEKEY=The ethereum private key to sign txs`

`ENVIRONMENT=production`

`XRELAYER=The authentication token for the API. Must be created on the debitllama.com dashboard on the /api page`

`URL=https://debitllama.com`

`KVPATH=database path or name or leave empty` Not a required field. 

You can leave KVPATH empty to use a local sqlite database stored in the deno folder or the kv instance of deno deploy you are deployed on. 

* Alternatively you can use `:memory` to use an in-memory database,
* specify a name like `data.db` to add a custom name to your Sqlite file,
* you can add file system path too to save it there, 
* or add a Deno KV remote url. If you add the deno kv url, the DENO_KV_ACCESS_TOKEN must be also set. Refer to the Deno deploy documentation for more information

`DENO_KV_ACCESS_TOKEN=only needed if database path is deno deploy else leave empty` Not required to be set

## How to run

`deno task start` will run the main application and start the scheduler which checks debitllama.com every 10 minutes. 
Do not increase the interval much otherwise you will get rate limited. Payment Intents are fetched in bulk and then queued.

You can process transactions manually too via tests.

`deno task processFixedPayments` will process all subscriptions that have non-dynamic fixed payment amount, fetches them all in bulk and solves them one by one.

`deno task lockRequests` will lock dynamic payment requests. There is a grace period after requesting dynamic payments, to give customers time to contact if there was an issue. 

The dynamic payments can be created on the debitllama.com user interface manually, or via the debitllama.com Rest API.

`deno task processLockedRequests` will process the locked dynamic payment requests, fetches them all in bulk, queues them and solves them one by one.

## Scaling (Optional)

The relayer uses Deno KV Queues and supports ACID transaction based locks with distributed workers, backed by FoundationDB provided by Deno Deploy.
We can parallelize intent solving and horizontally scale out on as many devices as needed. The lock on the queue guarantee transactions are never attempted to be processed twice.
You can run as many instances as you like, wherever you want. They will all work in sync, without conflicts.

## Monitoring

The application exposes an interface via port 8000:8000 where the relayer
balance can be seen, but it's a simple interface. It's more recommended to use a chain explorer.

To get notifications about payments via REST API, configure webhooks on debitllama.com.


## More chains
Support for more chains will be added as Debitllama starts supporting them. Request a new chain via email or contact form.