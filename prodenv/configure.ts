import * as base64 from "https://deno.land/std@0.207.0/encoding/base64.ts";

const dockerSecret = "/run/secrets/relayer_env.txt";

export async function configureCipherEnv() {
  const base64CipherEnv = await Deno.readTextFile(dockerSecret);
  const uintCipherEnv = base64.decodeBase64(base64CipherEnv);
  const textDecoder = new TextDecoder();
  const plainBase64Env = await runCommand(
    "gotpm",
    ["unseal"],
    textDecoder.decode(uintCipherEnv),
  );

  const uintPlainEnv = base64.decodeBase64(plainBase64Env);
  // The environment variables are encoded base64 twice
  assignEnv(textDecoder.decode(uintPlainEnv));
}

// This should run gotpm and get the json string output!
async function runCommand(
  commandName: string,
  commandArgs: string[],
  input: string,
): Promise<string> {
  const command = new Deno.Command(commandName, {
    args: commandArgs,
    stdin: "piped",
    stdout: "piped",
  });

  const process = command.spawn();
  const writer = process.stdin.getWriter();
  writer.write(new TextEncoder().encode(input));
  writer.releaseLock();

  await process.stdin.close();

  const result = await process.output();

  const textDecoder = new TextDecoder();
  // console.log("stderr:", textDecoder.decode(result.stderr));
  //TODO: IF error occurs deno should die

  const out = textDecoder.decode(result.stdout);
  if (out.endsWith("\n")) {
    return out.slice(0, out.length - 1);
  } else {
    return out;
  }
}

//set the decrypted secret to the runtime environment!
function assignEnv(plaintext: string) {
  const json = JSON.parse(plaintext);

  const envfields = Object.values(EnvFields);
  envfields.forEach((envkey) => {
    setEnv(envkey, json[envkey]);
  });
}

function setEnv(key: string, value: string) {
  Deno.env.set(key, value);
}

// The fields of the environment variables
enum EnvFields {
  RELAYER_PRIVATEKEY = "RELAYER_PRIVATEKEY",
  XRELAYER = "XRELAYER",
}

if (Deno.env.get("ENVIRONMENT") === "production") {
  await configureCipherEnv();
}
