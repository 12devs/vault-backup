const minimist = require('minimist');
const { VaultClient } = require('./client');
const { dump, getSecretEngines } = require('./dump');

const print = console.log.bind(console);

const usage = () => {
  print();
  print('Usage:');
  print('    node vault-operations.js <command> <arg1> <arg2> <arg3> --real');
  print();
  print('Configuration:');
  print('    export VAULT_ADDR=http://127.0.0.1:8200')
  print('    export VAULT_TOKEN=foo.bar12345')
  print();
  print('Commands:');
  print('  - secrets');
  print('      Print registered secret engines.');
  print('  - dump <engine>?');
  print('      Dump secrets of specified registered secret engine.');
  print('      If particular engine is omitted then dump everything.');
  process.exit(1);
}

function getClient() {
  const VAULT_ADDR = process.env.VAULT_ADDR || 'http://127.0.0.1:8200'
  const VAULT_TOKEN = process.env.VAULT_TOKEN || ''
  return new VaultClient(VAULT_ADDR, { token: VAULT_TOKEN })
}

async function secretEngines() {
  print('Registered secret engines:');
  const client = getClient()
  const engines = await getSecretEngines(client)
  engines.sort().forEach(name => print(` - ${name}`));
}

async function dumpCmd(args, secretName) {
  const client = getClient()
  if (secretName) {
    await dump(client, secretName)
  } else {
    await dump(client)
  }
}

const registeredCommands = {
  secrets: secretEngines,
  dump: dumpCmd,
}

async function main() {
  const args = minimist(process.argv.slice(2), {
    string: ['note'],
    boolean: ['real'],
  });

  const [ command, ...rest ] = args._;
  if (!command) {
    print('Please choose a command');
    usage();
  }
  const fn = registeredCommands[command]
  if (!fn) {
    print(`Unknown command ${command}`);
    usage();
  }

  await fn(args, ...rest);
}

void main();
