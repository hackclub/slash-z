import pkg from "@prisma/client"
import metrics from "../metrics.js"
const { PrismaClient } = pkg
let prisma = new PrismaClient()

import Bottleneck from 'bottleneck'

const VERBOSE_PRISMA_LOGGING = process.env.VERBOSE_PRISMA_LOGGING ? false : process.env.VERBOSE_PRISMA_LOGGING=='true'

const limiter = new Bottleneck({
  maxConcurrent: 4,
})

// prismaGet('Meeting')
// prismaGet('Meeting', '01234567')
// prismaGet('Meeting', { where: {id: '01234567'} })
const get = async (table, options) => {
  const ts = Date.now()
  if (VERBOSE_PRISMA_LOGGING)
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
    const results = await prisma[table].findMany({ where, orderBy, include })
    if (VERBOSE_PRISMA_LOGGING)
      console.log(`[${ts}] Found ${results.length} record(s)`)
    metrics.increment("prisma.get.success", 1)
    return results
  } catch (err) {
    metrics.increment("prisma.get.failure", 1)
    console.error(err)
  }
}

// prismaFind('User')
// prismaFind('User', '01234567')
// prismaFind('User', )
const find = async (table, options) => {
  const ts = Date.now()
  if (VERBOSE_PRISMA_LOGGING)
    console.log(`[${ts}] Trying to find '${table}' with options: '${JSON.stringify(options)}'`)
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
    if (VERBOSE_PRISMA_LOGGING)
      console.log(`[${ts}] Found record with ID '${result.id}'`)
    metrics.increment("prisma.find.success", 1)
    return result
  } catch (err) {
    metrics.increment("prisma.find.failure", 1)
    console.log(err)
  }
}

const count = async (table, options) => {
  let where, orderBy, include
  if (VERBOSE_PRISMA_LOGGING)
    console.log(`Trying to count '${table}' with options: '${JSON.stringify(options)}'`)
  if (typeof options === 'string') {
    where = { id: search }
  } else {
    where = options.where
    orderBy = options.orderBy
    include = options.include
  }
  try {
    const count = await prisma[table].count({ where, orderBy, include })
    metrics.increment("prisma.count.success", 1)
    return count
  } catch (err) {
    metrics.increment("prisma.count.failure", 1)
    console.error(err)
  }
}

const patch = async (table, recordID, fields) => {
  const ts = Date.now()
  try {
    if (VERBOSE_PRISMA_LOGGING)
      console.log(`[${ts}] PATCH '${table} ID ${recordID}' with the following fields:`, fields)
    const result = await prisma[table].update({
      where: {
        id: recordID,
      },
      data: fields
    })
    if (VERBOSE_PRISMA_LOGGING)
      console.log(`[${ts}] PATCH successful!`)
    metrics.increment("prisma.patch.success", 1)
    return result
  } catch (err) {
    metrics.increment("prisma.patch.failure", 1)
    console.error(err)
  }
}

const create = async (table, fields) => {
  const ts = Date.now()
  try {
    const result = await prisma[table].create({
      data: fields,
    })
    if (VERBOSE_PRISMA_LOGGING)
      console.log(`[${ts}] Created my record with id: ${result.id}`)
    metrics.increment("prisma.create.success", 1)
    return result
  } catch (err) {
    metrics.increment("prisma.create.failure", 1)
    console.error(err)
  }
}

const destroy = async (table, id) => {
  const ts = Date.now()
  try {
    if (VERBOSE_PRISMA_LOGGING)
      console.log(`[${ts}] DELETE '${table}' RECORD '${id}'`)
    const results = await prisma[table].delete({
      where: {
        id: id,
      },
    })
    if (VERBOSE_PRISMA_LOGGING)
      console.log(`[${ts}] Deletion successful on '${table}' table, record '${id}'!`)
    metrics.increment("prisma.destroy.success", 1)
    return results
  } catch (err) {
    metrics.increment("prisma.destroy.failure", 1)
    console.error(err)
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