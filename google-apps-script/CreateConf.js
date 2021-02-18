function createConference(arg= {}) {
  console.log('Running createConference with these args', JSON.stringify(arg, null, 2));
  const { eventData } = arg;
  const { calendarId, eventId } = eventData;

  // Retrieve the Calendar event information using the Calendar
  // Advanced service.
  var calendarEvent;
  try {
    calendarEvent = Calendar.Events.get(calendarId, eventId);
  } catch (err) {
    // The calendar event does not exist just yet; just proceed with the
    // given event ID and allow the event details to sync later.
    console.log(err);
    calendarEvent = {
      id: eventId,
    };
  }

  var dataBuilder = ConferenceDataService.newConferenceDataBuilder();
  var conferenceInfo = create3rdPartyConference(calendarEvent);

  if (conferenceInfo.error == 'AUTH') {
    const authenticationUrl = 'https://hack.af/z-authenticate';
    const error = ConferenceDataService.newConferenceError()
      .setConferenceErrorType(ConferenceDataService.ConferenceErrorType.AUTHENTICATION)
      .setAuthenticationUrl(authenticationUrl);
    dataBuilder.setError(error);
  } else if (conferenceInfo.error) {
    // Other error type;
    const error = ConferenceDataService.newConferenceError()
      .setConferenceErrorType(ConferenceDataService.ConferenceErrorType.TEMPORARY);
    dataBuilder.setError(error);
  } else {
    // No error, so build the ConferenceData object from the
    // returned conference info.

    const videoEntryPoint = ConferenceDataService.newEntryPoint()
      .setEntryPointType(ConferenceDataService.EntryPointType.VIDEO)
      .setUri(conferenceInfo.videoUri);

    dataBuilder.setConferenceId(conferenceInfo.id)
               .addEntryPoint(videoEntryPoint);
  }
  return dataBuilder.build();
}

function create3rdPartyConference(_calendarEvent) {
  console.log('creating 3rd party conference with info', JSON.stringify(_calendarEvent, null, 2))
  const data = {
    id: 'asdf',
    videoUri: 'https://hack.af/z?id=asdf'
  };
  return data;
}
