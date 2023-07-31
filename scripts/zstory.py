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
    prog="zstory", description="Helps you debug slash-z meetings"
)

subparser = parser.add_subparsers()

dissector = subparser.add_parser(
    "dissect", description="Debug what happened in slash-z calls"
)
dissector.add_argument(
    "meetid", default=None, nargs="*",
    help="The zoom schedule id e.g yzu4r in hack.af/z-join?id=yzu4r"
)  # argument is zoomID or call link name
dissector.add_argument(
    "-z", action="store_true",
    help="If provided, then <meetid> is considered to be the zoom meeting id e.g 88934609083"
)  # if present, will return the single zoom call
dissector.add_argument("--start", type=int, help="Specify the start time when searching for a meeting in a range")  # specifies a starting point of the search
dissector.add_argument("--end", type=int, help="Specify the latest time when searching for a meeting in a range")  # specifies a stopping point

# parse dissector args
d_args = dissector.parse_args()

if not d_args.meetid and not d_args.z and not d_args.start and not d_args.end:
    dissector.print_help() 
    quit()

# meeting passed here is of the form
# (meeting_id, start_time, end_time)
def check_overlap(meet_1: (str, int, int), meet_2: (str, int, int)):
    meet1 = range(meet_1[1], meet_1[2])
    meet2 = range(meet_2[1], meet_2[2])
    overlap = list(set(meet2).intersection(meet1))
    if len(overlap) > 0:
        return overlap[-1] - overlap[0]
    return 0


def trace_events(cursor: Cursor, meetingId: str):
    print("\nEvents...")
    # query the WebHook events of the meeting
    cursor.execute(
        'SELECT (timestamp, "rawData") FROM "WebhookEvent" WHERE "meetingId"=%s ORDER BY timestamp ASC',
        (meetingId,),
    )
    events = cursor.fetchall()

    if len(events) == 0:
        print("No WebhookEvents for this meeting")
        return

    # will be replaced with the timestamp of the first webhook event
    start_time = datetime.now()
    meetings = []
    for item in events:
        timestamp, event = item[0]
        event_dict = json.loads(event)
        event_type = event_dict["event"]

        time = datetime.fromisoformat(timestamp)
        if event_type == "meeting.started":
            print(f"\033[94mStart time = {time}\033[0;0m")

            for meeting in meetings:
                # in the situation where there are two meetings that were started using the same zoom_id
                # the ended_at time of the meeting is usually the same for them
                now = datetime.now()
                overlap = check_overlap(
                    (meetingId, int(meeting.timestamp()), int(now.timestamp())),
                    (meetingId, int(meeting.timestamp()), int(now.timestamp())),
                )
                if overlap > 0:
                    print(f"\033[93mOverlap \033[0;0m")

            start_time = time
            meetings.append(start_time)

        participant = event_dict["payload"]["object"].get("participant", None)

        print(
            f"{(time - start_time).seconds:5}s later | {(participant['user_name'] if participant else ''):15} | {event_type:6}"
        )


def filter_by_date(cursor: Cursor, start: int, end: int | None):
    query_no_end = 'SELECT ("zoomID", "startedAt", "endedAt") FROM "Meeting" WHERE "startedAt">=%s ORDER BY "startedAt" ASC'
    query_with_end = 'SELECT ("zoomID", "startedAt", "endedAt") FROM "Meeting" WHERE "startedAt">=%s AND "startedAt"<=%s ORDER BY "startedAt" ASC'

    if end is not None:
        cursor.execute(
            query_with_end, (datetime.fromtimestamp(start), datetime.fromtimestamp(end))
        )
    else:
        cursor.execute(query_no_end, (datetime.fromtimestamp(start),))

    meetings = cursor.fetchall()

    print(f"Found {len(meetings)} meetings")

    prev_meetings = []
    for idx, meeting in enumerate(meetings):
        overlap = 0

        zoom_id, started_at, ended_at = meeting[0]

        started_at = datetime.fromisoformat(started_at)
        ended_at = datetime.fromisoformat(ended_at) if ended_at else None

        if ended_at is not None:
            _meeting = (zoom_id, int(started_at.timestamp()), int(ended_at.timestamp()))
            # check for overlapping meetings
            for p_meeting in prev_meetings:
                # print("p_meeting = ", p_meeting)
                # print("curr meeting = ", _meeting)
                overlap = check_overlap(p_meeting, _meeting)

                if overlap > 0:
                    print(
                        f"\033[93mOverlap with ({p_meeting[0]}) by {overlap} seconds \033[0;0m"
                    )

            prev_meetings.append(_meeting)
            time_elapsed = ended_at - started_at
            print(
                f"zoomID: {zoom_id} | started {started_at} ended {time_elapsed.seconds}s later"
            )

        else:
            print(f"zoomID: {zoom_id} | started {ended_at} Ongoing... ")
        print()


def dissect_scheduled_meeting(cursor: Cursor, meetid: str, start, end):
    print(f"Tracing meetings with name {meetid}...")

    # get the scheduling link id
    cursor.execute('SELECT id FROM "SchedulingLink" WHERE name=%s', (meetid,))

    schedule = cursor.fetchone()
    scheduling_link_id = schedule[0] if schedule else None

    if scheduling_link_id is None:
        print(f"Scheduling link with name {meetid} does not exist")
        quit()

    queries = {
        "normal": 'SELECT (id, "zoomID", "startedAt", "endedAt") FROM "Meeting" WHERE "schedulingLinkId"=%s',
        "start": 'SELECT (id, "zoomID", "startedAt", "endedAt") FROM "Meeting" WHERE "schedulingLinkId"=%s AND "startedAt">=%s ORDER BY "startedAt" ASC',
        "end": 'SELECT (id, "zoomID", "startedAt", "endedAt") FROM "Meeting" WHERE "schedulingLinkId"=%s AND "startedAt">=%s AND "startedAt"<=%s ORDER BY "startedAt" ASC',
    }
    # query meeting id and zoom license
    if start and end:
        cursor.execute(
            queries.get("end"),
            (
                scheduling_link_id,
                datetime.fromtimestamp(start),
                datetime.fromtimestamp(end),
            ),
        )
    elif start and end is None:
        cursor.execute(
            queries.get("start"), (scheduling_link_id, datetime.fromtimestamp(start))
        )
    else:
        cursor.execute(queries.get("normal"), (scheduling_link_id,))

    meetings = cursor.fetchall()

    prev_meetings = []
    print(f"\n{len(meetings)} meetings found")
    for idx, meeting in enumerate(meetings):
        overlap = 0
        # zoomId also refers to the zoom license
        meetingId, zoomId, started_at, ended_at = meeting[0]
        started_at = datetime.fromisoformat(started_at)
        ended_at = datetime.fromisoformat(ended_at) if ended_at else None

        _meeting = (meetingId, int(started_at.timestamp()), int(ended_at.timestamp()))
        if ended_at is not None:
            # check for overlapping meetings
            for p_meeting in prev_meetings:
                # print("p_meeting = ", p_meeting)
                # print("curr meeting = ", _meeting)
                overlap = check_overlap(p_meeting, _meeting)

                if overlap > 0:
                    print(
                        f"\033[93mOverlap with ({p_meeting[0]}) by {overlap} seconds \033[0;0m"
                    )

            prev_meetings.append(_meeting)

        print(f"\nStory of meeting ({idx+1}) with ID = ", meetingId)
        print(f"Zoom started using license {zoomId} | {started_at}")
        trace_events(cursor, meetingId)

        prev_meeting = (meetingId, started_at)
        print(f"Released Zoom license {zoomId} | {ended_at}")


def dissect_slack_meeting(cursor: Cursor, meetingId: str):
    cursor.execute('SELECT id FROM "Meeting" WHERE "zoomID"=%s', (d_args.meetid[1],))  # type: ignore
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
                dissect_scheduled_meeting(
                    cursor, d_args.meetid[1], d_args.start, d_args.end
                )
                quit()

        if d_args.start:
            filter_by_date(cursor, d_args.start, d_args.end)
            quit()

    conn.commit()
