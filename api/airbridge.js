import AirtablePlus from 'airtable-plus'
import Bottleneck from 'bottleneck'

const limiter = new Bottleneck({
  maxConcurrent: 2,
  // minTime: 5000
})

const deletionLimiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 3000
})

/**
* Get the base ID of an airtable database
* @function
* @param {string} baseID - defaults to 'Slash-z'
* @returns {string}
*/
const getBaseID = function(baseID = 'Slash-z') {
  return {
    'Slash-z': 'appuEsdMf6hHXibSh',
    'Operations': 'apptEEFG5HTfGQE7h'
  }[baseID]
}

/**
* Read records from {table} with respect to {options}
* @function
* @param {string} table - The airtable table name
* @param {Object} options - Airtable options {table}
* @returns {Promise<Object>}
*/
const get = async (table, options = {}) => {
  const ts = Date.now()
  const {base, ...otherOptions} = options
  const baseID = getBaseID(base)
  try {
    const airtable = new AirtablePlus({
      baseID,
      apiKey: process.env.AIRBRIDGE_API_KEY,
      tableName: table,
    })
    console.log(`[${ts}] Airtable GET '${table}' with the following options:`, otherOptions)
    const results = await airtable.read(otherOptions)
    console.log(`[${ts}] Found ${results.length} records(s)`)
    return results
  } catch (err) {
    console.log(err)
  }
}

/**
* Find a record from {table} with {options}
* @function
* @param {string} table - The airtable table name
* @param {Object} options - Airtable options {table}
* @returns {Promise<Object>}
*/
const find = async (table, options) => {
  const results = await get(table, {...options, maxRecords: 1})
  return results[0]
}

/**
* Update the record with ID {recordID} in {table} with {fields}
* @function
* @param {string} table - The airtable table name
* @param {string} recordID - The record ID 
* @param {Object} fields - The fields to update
* @returns {Promise<Object>}
*/
const patch = async (table, recordID, fields) => {
  const ts = Date.now()
  try {
    console.log(`[${ts}] Airtable PATCH '${table} ID ${recordID}' with the following fields:`, fields)
    const airtable = new AirtablePlus({
      baseID: getBaseID('Slash-z'),
      apiKey: process.env.AIRBRIDGE_API_KEY,
      tableName: table,
    })
    const result = await airtable.update(recordID, fields)
    console.log(`[${ts}] Airtable PATCH successful!`)
    return result
  } catch (err) {
    console.log(err)
  }
}

/**
* Create a new record in {table} with {fields}
* @function
* @param {string} table - The airtable table name
* @param {Object} fields - The fields to update
* @returns {Promise<Object>}
*/
const create = async (table, fields) => {
  const ts = Date.now()
  try {
    console.log(`[${ts}] Airtable CREATE '${table}' with the following fields:`, fields)
    const airtable = new AirtablePlus({
      baseID: getBaseID('Slash-z'),
      apiKey: process.env.AIRBRIDGE_API_KEY,
      tableName: table,
    })
    const result = await airtable.create(fields)
    console.log(`[${ts}] Airtable created my record with id: ${result.id}`)
    return result
  } catch (err) {
    console.log(err)
  }
}

/**
* Delete the record with ID {id} in {table}
* @function
* @param {string} table - The airtable table name
* @param {string} id - The record ID 
* @returns {Promise<Object>}
*/
const destroy = async (table, id) => {
  const ts = Date.now()
  const airtable = new AirtablePlus({
    baseID: getBaseID('Slash-z'),
    apiKey: process.env.AIRBRIDGE_API_KEY,
    tableName: table,
  })
  try {
    console.log(`[${ts}] Airtable DELETE '${table}' RECORD '${id}'`)
    const results = await airtable.delete(id)
    console.log(`[${ts}] Airtable deletion successful on '${table}' table, record '${id}'!`)
    return results
  } catch (err) {
    console.log(err)
  }
}

export default {
  get: (...args) => limiter.schedule(() => get(...args)),
  find,
  patch: (...args) => limiter.schedule(() => patch(...args)),
  create: (...args) => limiter.schedule(() => create(...args)),
  destroy: (...args) => deletionLimiter.schedule(() => destroy(...args)),
}