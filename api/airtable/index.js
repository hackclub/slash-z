const { default: fetch } = require("node-fetch")

module.exports = class AirBridge {
  constructor() { }

  endpoint(path) {
    return 'https://api2.hackclub.com/v0.1/slash-z-msw-dev/' + path
  }

  get(table, options) {
    let url = `${endpoint(table)}?authKey=${process.env.AIRBRIDGE_API_KEY}`
    if (options) {
      url = url+`select=${JSON.stringify(options)}`
    }
    const result = (await fetch(url)).json()
    return result
  }

  find(table, options) {
    const [record, ..._others] = await (await this.get(table, {...options, maxRecords: 1})).json()
    return record
  }

  patch({table, id, fields}) {
    const url = `https://api2.hackclub.com/v0.1/slash-z-msw-dev/${table}?authKey=${process.env.AIRBRIDGE_API_KEY}`
    const results = (await fetch(url, {method: 'patch', body: JSON.stringify(fields)}))
    return results
  }
}