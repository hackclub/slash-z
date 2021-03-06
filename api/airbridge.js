const AirtablePlus = require('airtable-plus')
const Bottleneck = require('bottleneck')
const limiter = new Bottleneck({
  maxConcurrent: 2,
  // minTime: 5000
})

const deletionLimiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 3000
})

const get = async (table, options) => {
  try {
    const airtable = new AirtablePlus({
      baseID: 'appuEsdMf6hHXibSh',
      apiKey: process.env.AIRBRIDGE_API_KEY,
      tableName: table,
    })
    console.log(`Airtable GET '${table}' with the following options:`, options)
    const results = await airtable.read(options)
    console.log(`Found ${results.length} records(s)`)
    return results
  } catch (err) {
    console.log(err)
  }
}

const find = async (table, options) => {
  const results = await get(table, {...options, maxRecords: 1})
  return results[0]
}

const patch = async (table, recordID, fields) => {
  try {
    console.log(`Airtable PATCH '${table} ID ${recordID}' with the following fields:`, fields)
    const airtable = new AirtablePlus({
      baseID: 'appuEsdMf6hHXibSh',
      apiKey: process.env.AIRBRIDGE_API_KEY,
      tableName: table,
    })
    const result = await airtable.update(recordID, fields)
    return result
  } catch (err) {
    console.log(err)
  }
}

const create = async (table, fields) => {
  try {
    console.log(`Airtable CREATE '${table}' with the following fields:`, fields)
    const airtable = new AirtablePlus({
      baseID: 'appuEsdMf6hHXibSh',
      apiKey: process.env.AIRBRIDGE_API_KEY,
      tableName: table,
    })
    const results = await airtable.create(fields)
    console.log('Airtable created my record with these fields:', {results})
    return results
  } catch (err) {
    console.log(err)
  }
}

const destroy = async (table, id) => {
  const airtable = new AirtablePlus({
    baseID: 'appuEsdMf6hHXibSh',
    apiKey: process.env.AIRBRIDGE_API_KEY,
    tableName: table,
  })
  try {
    console.log(`Airtable DELETE '${table}' RECORD '${id}'`)
    const results = await airtable.delete(id)
    return results
  } catch (err) {
    console.log(err)
  }
}

module.exports = {
  get: (...args) => limiter.schedule(() => get(...args)),
  find,
  patch: (...args) => limiter.schedule(() => patch(...args)),
  create: (...args) => limiter.schedule(() => create(...args)),
  destroy: (...args) => deletionLimiter.schedule(() => destroy(...args)),
}