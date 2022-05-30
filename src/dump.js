const { userInfo } = require('os')
const { format } = require('util')
const { logAxiosError } = require('./utils')

const warn = console.warn.bind(console)
const print = console.log.bind(console)
const debug = console.debug.bind(console)
const encode = JSON.stringify.bind(JSON)

function buildSecretCmd(secretPath, data) {
  const secretParams = Object.keys(data)
    .sort()
    .map(key => [key, encode(data[key])])
    .map(([key, value]) => `${key}=${value}`)
    .join(' \\\n  ');
  return `vault write '${secretPath}' \\\n  ${secretParams}`;
}

function buildSecretCustomMetadataCmd(secretPath, customMetadata) {
  const params = Object.keys(customMetadata)
    .sort()
    .map(key => [key, encode(customMetadata[key])])
    .map(([key, value]) => `-custom-metadata ${key}=${value}`)
    .join(' \\\n  ');
  return `vault kv metadata put \\\n  ${params} \\\n  '${secretPath}'`
}

async function recurse_for_values(client, top_prefix, path_prefix, candidate_key) {
  const candidateValues = candidate_key.keys
    ? candidate_key.keys
    : candidate_key.data.keys;

  for (const candidateValue of candidateValues) {
    const nextLevel = path_prefix + candidateValue

    if (candidateValue.endsWith('/')) {
      const nextValue = await client.list(`${top_prefix}metadata/${nextLevel}`)
      await recurse_for_values(client, top_prefix, nextLevel, nextValue)
    } else {
      const final_data = await client.read(`${top_prefix}data/${nextLevel}`)

      if (final_data.rules) {
        print(format('echo -ne %s | vault policy write %s -', encode(final_data.rules), candidateValue))
      } else if (final_data.data && Object.keys(final_data.data).length) {
        const secretPath = `${top_prefix}${nextLevel}`;

        print(buildSecretCmd(secretPath, final_data.data))

        if (final_data.metadata.custom_metadata) {
          print(buildSecretCustomMetadataCmd(secretPath, final_data.metadata.custom_metadata))
        }

        print()
      } else {
        warn(format('*** WARNING: no data for %s', encode(nextLevel)))
      }
    }
  }
}

async function getSecretEngines(client) {
  const mounts = await client.getMounts()
  return Object.keys(mounts)
    .filter(k => mounts[k].type === 'kv');
}

function printDumpHeader() {
  const user = userInfo().username
  const date = new Date().toUTCString()
  const vault_address = process.env.VAULT_ADDR

  print('#!/bin/bash')
  print()
  print('# node src/a backup')
  print(format('# dump made by %s', user))
  print(format('# backup date: %s', date))
  print(format('# VAULT_ADDR env variable: %s', vault_address))
  print('#')
  print('# WARNING: not guaranteed to be consistent!')
  print('#')
  print()
}

async function dump(client, engineToDump) {
  const allEngines = await getSecretEngines(client)
  const engines = engineToDump ? [engineToDump] : allEngines

  printDumpHeader()

  for (const secretEngine of engines) {
    try {
      print(format('vault secrets enable -path=%s kv', secretEngine))

      const metadata = await client.list(`${secretEngine}metadata`)

      if (metadata) {
        await recurse_for_values(client, secretEngine, '', metadata)
      } else {
        // secret engine exists but empty
        warn(format('*** WARNING: empty secret engine %s', encode(secretEngine)))
      }
    } catch (err) {
      logAxiosError(err)
    }
  }
}

module.exports = {
  getSecretEngines,
  dump,
}
