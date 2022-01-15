import prisma from "../prisma.js";

export default async (req, res) => {
  const data = {
    hosts: {
      total: await prisma.count('host', { where: {enabled: true} }),
      open: await prisma.count('host', { where: {
        enabled: true,
        meetings: {
          every: { NOT: { endedAt: { equals: null }}}
        }
      }})
    },
  }
  return res.send(data)
}