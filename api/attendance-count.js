const JOINED = 'meeting.participant_joined'
const LEFT = 'meeting.participant_left'

const parse = raw => {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
}

const sessionOf = participant =>
  participant.participant_uuid || participant.user_id || participant.id || null

const personOf = participant =>
  (participant.user_name || '').trim().toLowerCase() ||
  participant.participant_user_id ||
  sessionOf(participant)

export const countAttendance = (meetings, from, to) => {
  let peak = 0
  const people = new Set()
  let counted = 0

  for (const meeting of meetings) {
    const events = (meeting.webhookEvents || [])
      .filter(event => event.eventType === JOINED || event.eventType === LEFT)
      .map(event => ({ ...event, at: new Date(event.timestamp).getTime() }))
      .filter(event => event.at >= from && event.at <= to)
      .sort((a, b) => a.at - b.at || (a.eventType === LEFT ? -1 : 1))

    if (events.length === 0) continue
    counted += 1

    const inCall = new Set()
    for (const event of events) {
      const participant = parse(event.rawData)?.payload?.object?.participant
      if (!participant) continue
      const session = sessionOf(participant)
      if (!session) continue
      if (event.eventType === JOINED) {
        inCall.add(session)
        const person = personOf(participant)
        if (person) people.add(person)
      } else {
        inCall.delete(session)
      }
      peak = Math.max(peak, inCall.size)
    }
  }

  return { meetings: counted, peak, unique: people.size }
}
