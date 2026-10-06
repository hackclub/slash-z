import crypto from 'crypto'
import Prisma from '../prisma.js'
import { countAttendance } from '../attendance-count.js'

const allowed = header => {
  const secret = process.env.ATTENDANCE_SECRET
  if (!secret || typeof header !== 'string') return false
  const given = Buffer.from(header)
  const wanted = Buffer.from(secret)
  return given.length === wanted.length && crypto.timingSafeEqual(given, wanted)
}

export default async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  if (!allowed(req.headers['x-attendance-secret']))
    return res.status(401).json({ error: 'unauthorized' })

  const from = new Date(req.query.from).getTime()
  const to = new Date(req.query.to).getTime()
  if (!req.query.id || Number.isNaN(from) || Number.isNaN(to) || from > to)
    return res
      .status(422)
      .json({ error: 'id, from and to (ISO dates, from before to) are required' })

  const link = await Prisma.find('schedulingLink', {
    where: { name: String(req.query.id) },
    include: {
      meetings: {
        include: {
          webhookEvents: {
            where: {
              eventType: {
                in: ['meeting.participant_joined', 'meeting.participant_left']
              },
              timestamp: { gte: new Date(from), lte: new Date(to) }
            }
          }
        }
      }
    }
  })
  if (!link) return res.status(404).json({ error: 'no such link' })

  return res.json(countAttendance(link.meetings || [], from, to))
}
