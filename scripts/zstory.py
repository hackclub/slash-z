import argparse
import psycopg
from psycopg.cursor import Cursor
import json
from datetime import datetime
from decouple import config

"""
This tool helps get an overview or the "story" of a certain zoom call.

Something like
<timestamp> slash-z meeting schedule link created
<timestamp> zoom created, using license <blah>
<timestamp> participant 1 joined
<timestamp> participant 2 joined
<timestamp> participant 1 left
<timestamp> participant 2 left
<timestamp> zoom destroyed, license <blah> released

Requirements:
- meeting name (e.g yzu82)
- schedulingLink id 
- get the license used by filtering for meetings using the schedulingLinkId in the Meeting table and look under ZoomID 
- also copy the meetingId
* Might also be useful to get the time that event happened
- get the events by looking into the WebhookEvent table using the meetingId copied 
- a zoom license is released when a zoom meeting is destroyed

"""

parser = argparse.ArgumentParser(
    prog="zstory",
    description="Helps you debug slash-z meetings"
) 

subparser = parser.add_subparsers()

dissector = subparser.add_parser("dissect", description="Dissect slash-z calls in detail")
dissector.add_argument("meetid", default=None, nargs="*") # argument is zoomID or call link name
dissector.add_argument("-z", action="store_true") # if present, will return the single zoom call
dissector.add_argument("--start", type=int) # specifies a starting point of the search
dissector.add_argument("--end", type=int) # specifies a stopping point

# parse dissector args
d_args = dissector.parse_args()

def trace_events(cursor: Cursor, meetingId: str):
    print("\nEvents...")
    # query the WebHook events of the meeting
    cursor.execute('SELECT (timestamp, "rawData") FROM "WebhookEvent" WHERE "meetingId"=%s ORDER BY timestamp ASC', (meetingId, ))
    events = cursor.fetchall()

    if len(events) == 0:
        print("No WebhookEvents for this meeting")
        return

    # will be replaced with the timestamp of the first webhook event
    start_time = datetime.now() 
    for item in events:
        timestamp, event = item[0]
        event_dict = json.loads(event)
        event_type = event_dict["event"]

        time = datetime.fromisoformat(timestamp)
        if event_type == "meeting.started": 
            print("Start time = ", time)
            start_time = time

        participant = event_dict["payload"]["object"].get("participant", None)
        
        print(f"{(time - start_time).seconds:5}s later | {(participant['user_name'] if participant else ''):15} | 🫡{event_type:6}")

def filter_by_date(cursor: Cursor, start: int, end: int | None):
    query_no_end = 'SELECT ("zoomID", "startedAt", "endedAt") FROM "Meeting" WHERE "startedAt">=%s ORDER BY "startedAt" ASC' 
    query_with_end = 'SELECT ("zoomID", "startedAt", "endedAt") FROM "Meeting" WHERE "startedAt">=%s AND "startedAt"<=%s ORDER BY "startedAt" ASC'

    if end is not None:
        cursor.execute(query_with_end, (datetime.fromtimestamp(start), datetime.fromtimestamp(end)))
    else:
        cursor.execute(query_no_end, (datetime.fromtimestamp(start),))

    meetings = cursor.fetchall()

    print(f"Found {len(meetings)} meetings")
    prev_meeting = ()
    for idx, meeting in enumerate(meetings):
        overlap = 0

        zoom_id, started_at, ended_at = meeting[0]

        started_at = datetime.fromisoformat(started_at)
        ended_at = datetime.fromisoformat(ended_at)

        if len(prev_meeting) > 0:
            overlap = started_at - prev_meeting[1]
            overlap = overlap.seconds

        if overlap <= 90 and idx > 0:
            print(f"\n\033[1;32;40mOverlap with (zoomID: {prev_meeting[0]}) by {overlap}seconds \033[0;0m") 
        
        if ended_at is not None:
            time_elapsed = ended_at - started_at 
            print(f"zoomID: {zoom_id} | started {started_at} ended {time_elapsed.seconds}s later ") 
        else: print(f"zoomID: {zoom_id} | started {ended_at} Ongoing...") 

        prev_meeting = (zoom_id, started_at)


def dissect_scheduled_meeting(cursor: Cursor, meetid: str, start, end):
    print(f"Tracing meetings with name {meetid}...")
    
    # get the scheduling link id
    cursor.execute('SELECT id FROM "SchedulingLink" WHERE name=%s', (meetid, ))

    schedule = cursor.fetchone()
    scheduling_link_id = schedule[0] if schedule else None

    if scheduling_link_id is None:
        print(f"Scheduling link with name {meetid} not found") 
        quit()
    
    queries = {
        "normal": 'SELECT (id, "zoomID", "startedAt") FROM "Meeting" WHERE "schedulingLinkId"=%s',
        "start": 'SELECT (id, "zoomID", "startedAt") FROM "Meeting" WHERE "schedulingLinkId"=%s AND "startedAt">=%s ORDER BY "startedAt" ASC',
        "end": 'SELECT (id, "zoomID", "startedAt") FROM "Meeting" WHERE "schedulingLinkId"=%s AND "startedAt">=%s AND "startedAt"<=%s ORDER BY "startedAt" ASC'
    }
    # query meeting id and zoom license
    if start and end:
        cursor.execute(queries.get("end"), (scheduling_link_id, datetime.fromtimestamp(start), datetime.fromtimestamp(end)))
    elif start and end is None:
        cursor.execute(queries.get("start"), (scheduling_link_id, datetime.fromtimestamp(start)))
    else: cursor.execute(queries.get("normal"), (scheduling_link_id, ))

    meetings = cursor.fetchall()

    prev_meeting = ()
    print(f"\n{len(meetings)} meetings found")
    for idx, meeting in enumerate(meetings):
        overlap = 0
        # zoomId also refers to the zoom license
        meetingId, zoomId, started_at = meeting[0] 
        started_at = datetime.fromisoformat(started_at)

        if len(prev_meeting) > 0:
            overlap = started_at - prev_meeting[1]
            overlap = overlap.seconds

        print(f"\nStory of meeting ({idx+1}) with ID = ", meetingId)
        print(f"Zoom started using license {zoomId}")
        if overlap <= 90 and idx > 0:
            print(f"\033[1;32;40mOverlap with ({prev_meeting[0]}) by {overlap}seconds \033[0;0m")
        trace_events(cursor, meetingId) 

        prev_meeting = (meetingId, started_at)
        print(f"Released Zoom license {zoomId}")

def dissect_slack_meeting(cursor: Cursor, meetingId: str):
    cursor.execute('SELECT id FROM "Meeting" WHERE "zoomID"=%s', (d_args.meetid[1],)) # type: ignore
    meeting = cursor.fetchone()
    meetingId = meeting[0] if meeting else None

    if meetingId is None: 
        print(f"Could not find meeting with ID {meetingId}")
        quit()

    print(f"Zoom started using license {d_args.meetid[1]}")
    trace_events(cursor, meetingId) 
    print(f"Released Zoom license {d_args.meetid[1]}")

# connect to the database
with psycopg.connect(config("DATABASE_URL")) as conn:
    # open cursor to perform database operations
    with conn.cursor() as cursor:

        # when accessing d_args.meetid we get [dissect, <meetid>]
        if len(d_args.meetid) > 1:
            if d_args.meetid[1] and d_args.z:
                dissect_slack_meeting(cursor, d_args.meetid[1])
                quit()
                
            if d_args.meetid[1] and not d_args.z:
                dissect_scheduled_meeting(cursor, d_args.meetid[1], d_args.start, d_args.end)
                quit()

        if d_args.start:
            filter_by_date(cursor, d_args.start, d_args.end)
            quit()

    conn.commit()
