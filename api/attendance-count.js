const JOINED = 'meeting.participant_joined'
const LEFT = 'meeting.participant_left'
const ENDED = 'meeting.ended'

export const ATTENDANCE_EVENTS = [JOINED, LEFT, ENDED]

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

// Applies one event to the sessions currently in the call (session -> person).
// Returns the person who joined, if any.
const apply = (inCall, event) => {
  if (event.eventType === ENDED) {
    inCall.clear()
    return null
  }
  const participant = parse(event.rawData)?.payload?.object?.participant
  if (!participant) return null
  const session = sessionOf(participant)
  if (!session) return null
  if (event.eventType === LEFT) {
    inCall.delete(session)
    return null
  }
  const person = personOf(participant)
  inCall.set(session, person)
  return person
}

// Events before `from` are replayed so people already in the call when the
// window opens are counted too.
export const countAttendance = (meetings, from, to) => {
  let peak = 0
  const people = new Set()
  let counted = 0

  for (const meeting of meetings) {
    const events = (meeting.webhookEvents || [])
      .filter(event => ATTENDANCE_EVENTS.includes(event.eventType))
      .map(event => ({ ...event, at: new Date(event.timestamp).getTime() }))
      .filter(event => event.at <= to)
      .sort((a, b) => a.at - b.at || (a.eventType === JOINED ? 1 : -1))

    const inCall = new Map()
    let i = 0
    for (; i < events.length && events[i].at < from; i++) apply(inCall, events[i])

    let attended = inCall.size > 0
    for (const person of inCall.values()) people.add(person)
    peak = Math.max(peak, inCall.size)

    for (; i < events.length; i++) {
      const person = apply(inCall, events[i])
      if (person) {
        attended = true
        people.add(person)
      }
      peak = Math.max(peak, inCall.size)
    }

    if (attended) counted += 1
  }

  return { meetings: counted, peak, unique: people.size }
}
