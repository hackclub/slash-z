import pkg from "@prisma/client"
const { PrismaClient } = pkg
let prisma = new PrismaClient()

import Bottleneck from 'bottleneck'

const limiter = new Bottleneck({
  maxConcurrent: 4,
})

// prismaGet('Meeting')
// prismaGet('Meeting', '01234567')
// prismaGet('Meeting', { where: {id: '01234567'} })
const get = async (table, options) => {
  const ts = Date.now()
  console.log(`[${ts}] Trying to get '${table}' with options:`, options)
  let where, orderBy, include
  if (typeof options === 'string') {
    where = { id: options }
  } else {
    where = options.where
    orderBy = options.orderBy
    include = options.include
  }
  try {
    return await prisma[table].findMany({ where, orderBy, include })
  } catch (err) {
    console.log(err)
  }
}

// prismaFind('User')
// prismaFind('User', '01234567')
// prismaFind('User', )
const find = async (table, options) => {
  console.log(`Trying to find '${table}' with options: '${JSON.stringify(options)}'`)
  let where, orderBy, include
  if (typeof options === 'string') {
    where = { id: options }
  } else {
    where = options.where
    orderBy = options.orderBy
    include = options.include
  }
  try {
    const result = await prisma[table].findFirst({ where, orderBy, include })
    console.log(`Found ${result}`)
    return result
  } catch (err) {
    console.log(err)
  }
}

const count = async (table, options) => {
  let where, orderBy, include
  console.log(`Trying to count '${table}' with options: '${JSON.stringify(options)}'`)
  if (typeof options === 'string') {
    where = { id: search }
  } else {
    where = options.where
    orderBy = options.orderBy
    include = options.include
  }
  try {
    return await prisma[table].count({ where, orderBy, include })
  } catch (err) {
    console.log(err)
  }
}

const patch = async (table, recordID, fields) => {
  const ts = Date.now()
  try {
    console.log(`[${ts}] PATCH '${table} ID ${recordID}' with the following fields:`, fields)
    const result = await prisma[table].update({
      where: {
        id: recordID,
      },
      data: fields
    })
    console.log(`[${ts}] PATCH successful!`)
    return result
  } catch (err) {
    console.log(err)
  }
}

const create = async (table, fields) => {
  const ts = Date.now()
  try {
    const result = await prisma[table].create({
      data: fields,
    })
    console.log(`[${ts}] Created my record with id: ${result.id}`)
    return result
  } catch (err) {
    console.log(err)
  }
}

const destroy = async (table, id) => {
  const ts = Date.now()
  try {
    console.log(`[${ts}] DELETE '${table}' RECORD '${id}'`)
    const results = await prisma[table].delete({
      where: {
        id: id,
      },
    })
    console.log(`[${ts}] Deletion successful on '${table}' table, record '${id}'!`)
    return results
  } catch (err) {
    console.log(err)
  }
}

export default {
  get: (...args) => limiter.schedule(() => get(...args)),
  find,
  count: (...args) => limiter.schedule(() => count(...args)),
  patch: (...args) => limiter.schedule(() => patch(...args)),
  create: (...args) => limiter.schedule(() => create(...args)),
  destroy: (...args) => deletionLimiter.schedule(() => destroy(...args)),
  client: prisma
}