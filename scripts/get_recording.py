from psycopg.cursor import Cursor
import psycopg
import os
import sys
import requests
import json

if len(sys.argv) < 2:
    print("Please pass the zoom call ID")
    sys.exit()

zoom_id = sys.argv[1]
database_url = os.environ['DATABASE_URL']
zoom_key = os.environ['ZOOM_KEY']
zoom_account_id = os.environ['ZOOM_ACCOUNT_ID']

def _request_recording_from_zoom(zoomCallID: str, access_token: str):
    base_url = "https://api.zoom.us/v2/"
    recordings_endpoint = f"/meetings/{zoomCallID}/recordings"
    url = base_url + recordings_endpoint
    response = requests.get(url, headers={
        # "authorization": f"Bearer eyJzdiI6IjAwMDAwMSIsImFsZyI6IkhTNTEyIiwidiI6IjIuMCIsImtpZCI6IjI1NzVjZTdmLTdmMTQtNDBiYi1hNWRhLWE3MmNmMzM4MjcyMyJ9.eyJhdWQiOiJodHRwczovL29hdXRoLnpvb20udXMiLCJ1aWQiOiJhbmJudEFSZFJkZVZQcmhlTUZCMjVRIiwidmVyIjo5LCJhdWlkIjoiMDM5OGExM2M3YjNkMDgwYjFmMzkyZTdmMjQ4Njk5MzEiLCJuYmYiOjE3MjUwMjI2NzUsImNvZGUiOiJSaXhIUkc1U1JUbVdoWU5oRExyYnBneXlKWXZTb2Nha3EiLCJpc3MiOiJ6bTpjaWQ6TjE4S2RiTzJROGFJUUZSMHNXWVIzUSIsImdubyI6MCwiZXhwIjoxNzI1MDI2Mjc1LCJ0eXBlIjozLCJpYXQiOjE3MjUwMjI2NzUsImFpZCI6IjZNWTdqYTRxUml1T2s1bG5ycFg3NEEifQ.QOuCiD1eRsRp-0CZJplt_EZtD8znfoeHyEJo5GfcwjdlXfk0cOSTbSb740Jnf51p1sBRUlnTqm_B7jeInf7IYA"
        "authorization": f"Bearer eyJzdiI6IjAwMDAwMiIsImFsZyI6IkhTNTEyIiwidiI6IjIuMCIsImtpZCI6ImQwNjNhYWFhLThhNGQtNGY1MS05MjhlLThlN2Y4MmE1ZjgwOSJ9.eyJhdWQiOiJodHRwczovL29hdXRoLnpvb20udXMiLCJ1aWQiOiJhbmJudEFSZFJkZVZQcmhlTUZCMjVRIiwidmVyIjoxMCwiYXVpZCI6IjZiOThjZjA4YTVkZjFlOGU3NTIxM2MzZDIzYjZlOGE0Y2EzNDA0MTY2MjQxZGUzZTViMTQyN2Y4YjhlM2M2MmUiLCJuYmYiOjE3NDA0MTk5MTEsImNvZGUiOiItZUZfSklxLVRGLThCaF9lSU03X2xBMW9QcllhTFV1TXEiLCJpc3MiOiJ6bTpjaWQ6TjE4S2RiTzJROGFJUUZSMHNXWVIzUSIsImdubyI6MCwiZXhwIjoxNzQwNDIzNTExLCJ0eXBlIjozLCJpYXQiOjE3NDA0MTk5MTEsImFpZCI6IjZNWTdqYTRxUml1T2s1bG5ycFg3NEEifQ.bOrLuPKRKyK8dYviBdsCcbS0FTyTx8C4CnPOo_xjBRcTb7RynvppGMtcTNYGpFShg-s5pJK-He9teMKwHQnOaQ"
    }).content.decode("utf-8")
    return json.loads(response)

def _build_zoom_token(zoom_key: str, zoom_account_id: str):
    print("zoom key", zoom_key, "zoom account id", zoom_account_id)
    response = requests.post("https://zoom.us/oauth/token", data={
        "grant_type": "account_credentials",
        "account_id": zoom_account_id
    }, headers={
        "Content-Type": "application/x-www-form-urlencoded",
        "Host": "zoom.us",
        "Authorization": f"Basic ${zoom_key}"
    }).json()
    # print(response)
    # data = json.loads(response)
    print(response)
    return response.get("access_token")

with psycopg.connect(database_url) as connection:
    with connection.cursor() as cursor:
        meeting_query = 'SELECT ("hostID") from "Meeting" where "zoomID" = %s' 
        host_query = 'SELECT ("apiKey", "apiSecret") from "Host" where "id" = %s' 
        meeting_data = cursor.execute(meeting_query, (zoom_id,)).fetchone()
        host_data = cursor.execute(host_query, (meeting_data[0],)).fetchone()

        print(host_data)

        api_key, api_secret = host_data[0]

        # zoom_token = _build_zoom_token(zoom_account_id=zoom_account_id, zoom_key=zoom_key)
        # print("zoom token", zoom_token)
        # recording_data = _request_recording_from_zoom(zoom_id, zoom_token)
        recording_data = _request_recording_from_zoom(zoom_id, "")
        print(recording_data)