const axios = require('axios')
const { appLogger } = require('./log')

const logger = appLogger.child({ scope: 'services.vaultClient' })

function VaultClient(baseURL, credentials) {
  const { token } = credentials
  if (!token) {
    throw new Error('Missing public key')
  }

  const getHeaders = (parameters = {}) => {
    return {
      'X-Vault-Request': 'true',
      'X-Vault-Token': token,
    }
  }

  const postRequest = (endpoint, data = {}) => {
    return axios({
      method: 'POST',
      headers: getHeaders(data),
      baseURL,
      url: endpoint,
      data
    })
  }

  const getRequest = (endpoint, data = {}) => {
    return axios({
      method: 'GET',
      headers: getHeaders(data),
      baseURL,
      url: endpoint
    })
  }

  const listRequest = (endpoint, data = {}) => {
    return axios({
      method: 'LIST',
      headers: getHeaders(data),
      baseURL,
      url: endpoint
    })
  }

  const requestWrapper = async (fn) => {
    try {
      const response = await fn()
      const { data } = response
      if (!data) {
        throw new Error('Did not receive answer from Vault')
      }
      if (!data.data) {
        throw new Error(data.error || 'Undefined API error')
      }
      return data.data
    } catch (err) {
      if (err.isAxiosError || axios.isAxiosError(err)) {
        if (!err.response) {
          throw new Error(err.message)
        }
        if (err.response.data && err.response.data.error) {
          throw new Error(err.response.data.error)
        }
        throw new Error(`${err.response.status} ${err.response.statusText}`)
      }
      throw err
    }
  }

  return {
    list: async (path) => {
      try {
        return await requestWrapper(
          () => listRequest(`/v1/${path}`)
        )
      } catch (err) {
        if (err.message === '404 Not Found') {
          return null
        }
        throw err
      }
    },
    read: async (path) => {
      return await requestWrapper(
        () => getRequest(`/v1/${path}`)
      )
    },
    getMounts: async () => {
      return await requestWrapper(
        () => getRequest(`/v1/sys/mounts`)
      )
    },
  }
}

module.exports = {
  VaultClient,
}
