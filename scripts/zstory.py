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

# the default argument we want to get is the scheduling link name
parser.add_argument("-s", "--sched")
parser.add_argument("-z", "--zoom")
parser.add_argument("--start", type=int)
parser.add_argument("--end", type=int)

# parse the arguments!
args = parser.parse_args()


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
    print(meetings)

    print(f"Found {len(meetings)} meetings")
    for meeting in meetings:
        meeting = meeting[0]
        
        if meeting[2] is not None:
            time_elapsed = datetime.fromisoformat(meeting[2]) - datetime.fromisoformat(meeting[1])
            print(f"zoomID: {meeting[0]} | started {meeting[1]} ended {time_elapsed.seconds}s later ") 
        else: print(f"zoomID: {meeting[0]} | started {meeting[1]} Ongoing...") 


# connect to the database
with psycopg.connect(config("DATABASE_URL")) as conn:
    # open cursor to perform database operations
    with conn.cursor() as cursor:

        if args.start:
            filter_by_date(cursor, args.start, args.end)
            quit()

        if args.zoom:
            cursor.execute('SELECT id FROM "Meeting" WHERE "zoomID"=%s', (args.zoom,)) # type: ignore
            meeting = cursor.fetchone()
            meetingId = meeting[0] if meeting else None

            if meetingId is None: 
                print(f"Could not find meeting with ID {meetingId}")
                quit()

            print(f"Zoom started using license {args.zoom}")
            trace_events(cursor, meetingId) 
            print(f"Released Zoom license {args.zoom}")
            quit()
            
        if args.sched:
            print(f"Tracing meeting {args.sched}...")
            # get the scheduling link id
            cursor.execute('SELECT id FROM "SchedulingLink" WHERE name=%s', (args.sched,)) # type: ignore
            schedule = cursor.fetchone()
            scheduling_link_id = schedule[0] if schedule else None

            if scheduling_link_id is None:
                print(f"Scheduling link with name {args.sched} not found") 
                quit()
            

            # query meeting id and zoom license
            cursor.execute('SELECT (id, "zoomID") FROM "Meeting" WHERE "schedulingLinkId"=%s', (scheduling_link_id,))
            meetings = cursor.fetchall()

            print(f"\n{len(meetings)} meetings found")
            for idx, meeting in enumerate(meetings):
                # zoomId also refers to the zoom license
                meetingId, zoomId = meeting[0] 

                print(f"\n Story of meeting ({idx+1}) with ID = ", meetingId)
                print(f"Zoom started using license {zoomId}")

                trace_events(cursor, meetingId) 

                print(f"Released Zoom license {zoomId}")
    conn.commit()
