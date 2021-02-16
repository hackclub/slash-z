const AirtablePlus = require('airtable-plus')

const get = async (table, options) => {
  try {
    const airtable = new AirtablePlus({
      baseID: 'appuEsdMf6hHXibSh',
      apiKey: process.env.AIRBRIDGE_API_KEY,
      tableName: table,
    })
    const results = await airtable.read(options)
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
    const airtable = new AirtablePlus({
      baseID: 'appuEsdMf6hHXibSh',
      apiKey: process.env.AIRBRIDGE_API_KEY,
      tableName: table,
    })
    const results = await airtable.create(fields)
    return results[0]
  } catch (err) {
    console.log(err)
  }
}

module.exports = {
  get, find, patch, create
}