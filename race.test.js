
const baseUrl = "https://js-slash-z.herokuapp.com";

// sends n parallel requests to schedule link with id
async function openParallelCalls(n, id) {
    const requests = [];
    for (let i = 0; i < n; i++) {
        const request = fetch(`${baseUrl}/api/endpoints/schedule-link?id=${id}`);
        requests.push(request);
    }

    const responses = await Promise.all(requests);
    const results = await Promise.all(responses.map(res => res.text()));

    let firstResult;
    let allMatch = true;
    results.forEach((result, idx) => {
        const matchZoom = new RegExp(/<meta property="og:url"+/);
        const _result = matchZoom.exec(result);
        const zoomurl = result.slice(_result.index, _result.index + 110);
        console.log(zoomurl);
        if (idx === 0) firstResult = zoomurl;
        if (zoomurl !== firstResult) allMatch = false;
        console.log("-----------------------");
    })
    console.log(`All zoom calls ${allMatch ? "do" : "don't"} match`);
    return allMatch;
}

async function getOpenMeetings() {
    const omReq = await fetch(`${baseUrl}/api/endpoints/stats`);
    const omRes = await omReq.json();

    console.log("open calls = ", omRes.hosts.open);
}
// sendParallelRequests(8, "cdrq1").then(() => getOpenMeetings())

test("Concurrent join requests does not lead to different calls", async () => {
    const sameCalls = await openParallelCalls(2, "cdrq1");
    expect(sameCalls).toBe(true);
});