# DebitLlama Relayer

This runs on a VPS, ideally hosted locally so the private keys are never exposed to the internet directly!
On a Debian Virtual Machine!

## Virtual Machine setup after install:

`sudo apt update`

`sudo apt upgrade`

`adduser debitllama`

`usermod -aG sudo debitllama`

## Need to install Deno and Node for PM2

install node

`curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -`

`sudo apt-get install -y nodejs`

intall pm2

`npm install -g pm2`

configure systemd for pm2

`pm2 startup systemd`

install deno

`curl -fsSL https://deno.land/x/install/install.sh | sh`


## Clone the repository from github
nuff said, make sure to use the debitllama user

## Run the server
`chmod a+x run.sh`

`./run.sh`


