# DebitLlama Relayer

A Scalable meta-transaction relayer.

## Docker

Build image using docker with `docker build -t debitllama-relayer .`

The deployment should be done from the debitLlama-compose repository!

### ENV

These variables need to be filled out to use this relayer.

`RELAYER_PRIVATEKEY=The private key to relay txs`

`ENVIRONMENT=development or production`

`XRELAYER=The authentication token for the API`

`URL=The url of the API to fetch from`

Encrypt the ENV using GOTPM on the hardware device, then add the encrypted env
to the container using docker secrets. The applicaiton will decrypt the env and
inejct it into the deno runtime

## Scaling

The relayer uses Deno KV for a distributed lock, so by horizontally scaling the
relayers we can parallelize intent solving on as much devices as we like.
