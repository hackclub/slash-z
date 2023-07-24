# How to investigate a slash-z call/link

## Requirements

- NodeJS
- Slash-Z 
- Slash-Z environment variables set

## Debugging using Prisma Studio

### Assumptions

* You have the meeting id
* You know the time span during which the meeting was ran (sometimes there could be more than one meeting days apart with the same meeting id)

- Start Prisma studio using `npx prisma studio` inside Slash-z

#### Getting the schduling link (schedule id)

- Open a new tab for the `SchedulingLink` and filter for links where name equals to the meeting id you have. Copy the id of the SchedulingLink.
- Go under the **Meeting** table and filter for meetings where the SchedulingLinkId matches the id -- you may also want to consider looking at the date.
- Copy the meeting id
- You may want to collect the *zoomID* as it'll be useful in getting the **CustomLogs**

### Getting the *CustomLogs*

- Open the **CustomLogs** tab and search for meetings where the zoomCallId matches the zoomId you just collected
- You may also want to add a date filter

### Getting the *ErrorLogs*

- Open the **ErrorLogs** tab and filter meetings that fall within the time span you are interested in. We do not seem to be writing the `meetingId` in the **ErrorLog** table at the time of writing.
- Your point of interset should most likely be in the `text` and `stackTrace` columns of the table.

## Get the Webhook events of a particular meeting

- Go under the **Meeting** column and copy the id of the meeting you are interested in if you haven't alread.
- Go under **webhookEvent** column and filter for the event that matches the meeting id you just copied -- you may also include a date filter to get those you're interested in