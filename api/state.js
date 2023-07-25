import prisma from './prisma.js'

export async function getTotalHosts() {
    return prisma.count('host', { where: {enabled: true} })
}

export async function getOpenHosts() {
    return prisma.count('host', { where: {
        enabled: true,
        meetings: {
          every: { NOT: { endedAt: { equals: null }}}
        }
      }})
}
