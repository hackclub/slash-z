import { countAttendance } from './attendance-count.js'

const at = minutes => new Date(Date.UTC(2026, 9, 6, 17, minutes)).toISOString()

const hook = (type, minutes, participant) => ({
  eventType: `meeting.participant_${type}`,
  timestamp: at(minutes),
  rawData: JSON.stringify({ payload: { object: { participant } } })
})

const ada = { user_name: 'Ada', participant_uuid: 'a1' }
const adaAgain = { user_name: 'ada ', participant_uuid: 'a2' }
const bob = { user_name: 'Bob', participant_uuid: 'b1' }

const FROM = new Date(at(0)).getTime()
const TO = new Date(at(59)).getTime()

test('counts the most people in the call at once', () => {
  const meeting = {
    webhookEvents: [
      hook('joined', 1, ada),
      hook('joined', 2, bob),
      hook('left', 3, ada),
      hook('joined', 4, adaAgain),
      hook('left', 5, bob)
    ]
  }
  expect(countAttendance([meeting], FROM, TO)).toEqual({
    meetings: 1,
    peak: 2,
    unique: 2
  })
})

test('ignores duplicate joins and events outside the window', () => {
  const meeting = {
    webhookEvents: [
      hook('joined', 1, ada),
      hook('joined', 1, ada),
      { ...hook('joined', 0, bob), timestamp: at(-30) }
    ]
  }
  expect(countAttendance([meeting], FROM, TO)).toEqual({
    meetings: 1,
    peak: 1,
    unique: 1
  })
})

test('is zero for a link nobody joined', () => {
  expect(countAttendance([{ webhookEvents: [] }], FROM, TO)).toEqual({
    meetings: 0,
    peak: 0,
    unique: 0
  })
})
