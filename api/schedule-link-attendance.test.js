// Runs the attendance endpoint against a real Postgres database.
// Only runs when TEST_DATABASE_URL is set (CI sets it), so a local .env
// pointing at production is never written to.

const dbUrl = process.env.TEST_DATABASE_URL
const describeDb = dbUrl ? describe : describe.skip

const SECRET = 'test-attendance-secret'
const at = minutes => new Date(Date.UTC(2026, 9, 6, 17, minutes))

const hook = (meetingId, type, minutes, participant) => ({
  meetingId,
  eventType: `meeting.participant_${type}`,
  timestamp: at(minutes),
  rawData: JSON.stringify({ payload: { object: { participant } } })
})

const call = async (handler, { method = 'GET', secret = SECRET, query }) => {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    }
  }
  const headers = secret ? { 'x-attendance-secret': secret } : {}
  await handler({ method, headers, query }, res)
  return res
}

describeDb('GET /api/endpoints/schedule-link-attendance', () => {
  let db, handler, appPrisma, metrics
  const linkName = `attendance-test-${Date.now()}`
  const created = {}

  beforeAll(async () => {
    process.env.DATABASE_URL = dbUrl
    process.env.ATTENDANCE_SECRET = SECRET
    const { PrismaClient } = (await import('@prisma/client')).default
    db = new PrismaClient({ datasources: { db: { url: dbUrl } } })

    handler = (await import('./endpoints/schedule-link-attendance.js')).default
    appPrisma = (await import('./prisma.js')).default
    metrics = (await import('../metrics.js')).default

    created.account = await db.authedAccount.create({ data: {} })
    created.host = await db.host.create({
      data: {
        email: 'host@example.com',
        enabled: true,
        testing: true,
        displayName: 'Test Host',
        apiKey: 'key',
        apiSecret: 'secret',
        zoomID: 'zoom-host'
      }
    })
    created.link = await db.schedulingLink.create({
      data: { name: linkName, authedAccountID: created.account.id }
    })
    const meeting = data =>
      db.meeting.create({
        data: {
          zoomID: 'zoom-meeting',
          hostID: created.host.id,
          public: true,
          schedulingLinkId: created.link.id,
          ...data
        }
      })
    created.meeting = await meeting({ startedAt: at(-40) })
    // ended before the window, with someone whose "left" event was dropped
    created.endedMeeting = await meeting({ startedAt: at(-60), endedAt: at(-45) })

    const ada = { user_name: 'Ada', participant_uuid: 'a1' }
    const bob = { user_name: 'Bob', participant_uuid: 'b1' }
    const carol = { user_name: 'Carol', participant_uuid: 'c1' }
    const early = { user_name: 'Early', participant_uuid: 'e1' }
    const ghost = { user_name: 'Ghost', participant_uuid: 'g1' }
    const id = created.meeting.id
    await db.webhookEvent.createMany({
      data: [
        hook(id, 'joined', -30, early), // in and out before the window
        hook(id, 'left', -20, early),
        hook(id, 'joined', -15, carol), // already in the call when the window opens
        hook(id, 'joined', 1, ada),
        hook(id, 'joined', 2, bob),
        hook(id, 'left', 3, ada),
        hook(id, 'joined', 75, ada), // after the window
        { ...hook(id, 'joined', 4, ada), eventType: 'meeting.started' }, // ignored type
        hook(created.endedMeeting.id, 'joined', -55, ghost)
      ]
    })
  })

  afterAll(async () => {
    const meetingIds = [created.meeting?.id, created.endedMeeting?.id].filter(Boolean)
    await db.webhookEvent.deleteMany({ where: { meetingId: { in: meetingIds } } })
    await db.meeting.deleteMany({ where: { id: { in: meetingIds } } })
    if (created.link) await db.schedulingLink.delete({ where: { id: created.link.id } })
    if (created.host) await db.host.delete({ where: { id: created.host.id } })
    if (created.account) await db.authedAccount.delete({ where: { id: created.account.id } })
    await db?.$disconnect()
    await appPrisma?.client.$disconnect()
    metrics?.close()
  })

  const window = { from: at(0).toISOString(), to: at(59).toISOString() }

  test('counts attendance for a link within the window', async () => {
    const res = await call(handler, { query: { id: linkName, ...window } })
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ meetings: 1, peak: 3, unique: 3 })
  })

  test('rejects a missing or wrong secret', async () => {
    expect((await call(handler, { secret: null, query: { id: linkName, ...window } })).statusCode).toBe(401)
    expect((await call(handler, { secret: 'nope', query: { id: linkName, ...window } })).statusCode).toBe(401)
  })

  test('rejects bad dates', async () => {
    const res = await call(handler, { query: { id: linkName, from: 'yesterday', to: window.to } })
    expect(res.statusCode).toBe(422)
    const flipped = await call(handler, { query: { id: linkName, from: window.to, to: window.from } })
    expect(flipped.statusCode).toBe(422)
  })

  test('404s for an unknown link', async () => {
    const res = await call(handler, { query: { id: `${linkName}-missing`, ...window } })
    expect(res.statusCode).toBe(404)
  })

  test('only allows GET', async () => {
    const res = await call(handler, { method: 'POST', query: { id: linkName, ...window } })
    expect(res.statusCode).toBe(405)
  })
})
