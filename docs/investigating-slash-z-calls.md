# Investigating a slash-z call/link

## Requirements
Slash-Z project setup with the appropriate environment variables

## Inspecting logs with the help of Prisma Studio

### Assumptions

* You have the scheduling link name
* You know the time span during which the meeting was ran (sometimes there could be more than one meeting days apart with the same scheduling link name)

> The scheduling link name is the 6-character long name you get at the end of a meeting link such as `https://hack.af/z-join?id=ycbrff` (in which case the scheduling link name is `ycbrff`)

- Start Prisma studio using `npx prisma studio` inside Slash-z

#### Getting the schduling link (schedule id)

- Open a new tab for the `SchedulingLink` and filter for links where name equals to the scheduling link name you have. Copy the id of the SchedulingLink.
- Go under the **Meeting** table and filter for meetings where the `SchedulingLinkId` matches the id. You may also want to consider looking at the date.
- Copy the meeting id.
- You may want to collect the *zoomID* as it'll be useful in getting the **CustomLogs**.

### Getting the *CustomLogs*

- Open the **CustomLogs** tab and search for meetings where the `zoomCallId` matches the `zoomId` you just collected.
- You may also want to add a date filter if you want more specific results.

### Getting the *ErrorLogs*

- Open the **ErrorLogs** tab and filter meetings whose id match that which you are interested in. 
- Your point of interset should most likely be in the `text` and `stackTrace` columns of the table.

## Get the Webhook events of a particular meeting

- Go under the **Meeting** column and copy the id of the meeting you are interested in if you haven't alread.
- Go under **webhookEvent** column and filter for the event whose `meetingId` matches that of the meeting you are interested in. 