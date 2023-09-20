# a shell script to start DebitLlama on the server with pm2 to enter the secrets on the CLI
#!/bin/bash

echo "Hi boss! We gonna run the relaer with pm2. Everything should be going as planned! There are just a few things to take care of first. Please pay attention!"

sleep 1

echo "Enter the SUPABASE_URL"
read -s supabase_url

echo "Awesome. Now Enter the SUPABASE_KEY"
read -s supabase_key


echo "Well done! Now Enter the RELAYER_PRIVATEKEY"
read -s relayer_privatekey

ENV=production SUPABASE_URL=${supabase_url} SUPABASE_KEY=${supabase_key} RELAYER_PRIVATEKEY=${relayer_privatekey} pm2 start main.ts --interpreter="deno" --interpreter-args="run -A" 