
const baseUrl = "https://js-slash-z.herokuapp.com";

async function generateNewMeeting() {
    const response = await fetch(`${baseUrl}/api/endpoints/new-schedule-link`);
    const result = await response.json();

    return result.id;
}

// sends n parallel requests to schedule link with id
async function openParallelCalls(n, id) {
    const requests = [];
    for (let i = 0; i < n; i++) {
        const request = fetch(`${baseUrl}/api/endpoints/schedule-link?id=${id}`);
        requests.push(request);
    }

    const responses = await Promise.all(requests);
    const results = await Promise.all(responses.map(res => res.text()));

    const zoomUrls = results.map(result => {
        // find the index of the meta containing the zoom url
        const matchZoom = new RegExp(/<meta property="og:url"+/);
        const _result = matchZoom.exec(result);

        // get the meta tag with the zoom call link
        const zoomurl = result.slice(_result.index, _result.index + 110);
        console.log("Zoom Meta = ", zoomurl);
        console.log("-----------------------");

        return zoomurl;
    });

    const urlSet = new Set(zoomUrls);
    console.log("Unique calls = ", urlSet.size);

    return  urlSet.size === 1 ? true : false; 
}

// checks for the number of open meetings
async function getOpenMeetings() {
    const omReq = await fetch(`${baseUrl}/api/endpoints/stats`);
    const omRes = await omReq.json();

    console.log("Open calls = ", omRes.hosts.open);
}

test("Concurrent join requests does not lead to different calls", async () => {
    const meetingName = await generateNewMeeting();
    const sameCalls = await openParallelCalls(2, meetingName);

    expect(sameCalls).toBe(true);
});