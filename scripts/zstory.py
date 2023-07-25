import argparse
import psycopg
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
- get the events by looking into the WebhookEvent table using the meetingId copied (make sure to filter by timestamp)
- a zoom license is released when a zoom meeting is destroyed

How??
- Need to connect to the database and make queries.
"""

parser = argparse.ArgumentParser(
    prog="zstory",
    description="Helps you debug slash-z meetings"
) 

# the default argument we want to get is the scheduling link name
parser.add_argument("meetid")

# parse the arguments!
args = parser.parse_args()

print(args.meetid)

def event_name(event_str) -> str:
    if event_str == "meeting.participant_joined":
        return "joined"
    elif event_str == "meeting.participant_left":
        return "left"
    elif event_str == "meeting.started":
        return "Meeting started"
    else:
        return "Meeting ended"

def show_time(time: int) -> float:
    if time < 60:
        return time
    return time / 60

# connect to the database
with psycopg.connect(config("DATABASE_URL")) as conn:
    # open cursor to perform database operations
    with conn.cursor() as cursor:

        # get the scheduling link id
        cursor.execute('SELECT id FROM "SchedulingLink" WHERE name=%s', (args.meetid,)) # type: ignore
        result = cursor.fetchone()
        scheduling_link_id = result[0] if result else None

        # query meeting id and zoom license
        cursor.execute('SELECT (id, "zoomID") FROM "Meeting" WHERE "schedulingLinkId"=%s', (scheduling_link_id,))
        result = cursor.fetchone()
        # print("meeting = ", result)

        # zoomId also refers to the zoom license
        meetingId, zoomId = result[0] if result else (None, None)
        print("meetingId = ", meetingId)
        print("zoomId = ", zoomId)

        print("Events...")
        # query the WebHook events of the meeting
        cursor.execute('SELECT (timestamp, "rawData") FROM "WebhookEvent" WHERE "meetingId"=%s ORDER BY timestamp ASC', (meetingId, ))
        events = cursor.fetchall()

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
            if event_type == "meeting.started" or event_type == "meeting.ended":
                print("🫡", event_type)
            else:
                print(f"{(time - start_time).seconds:5}s later | {(participant['user_name'] if participant else ''):15} {event_name(event_type):6}")
            

    conn.commit()