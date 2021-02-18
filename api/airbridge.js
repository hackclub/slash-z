const AirtablePlus = require('airtable-plus')

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

module.exports = {
  get, find, patch, create
}