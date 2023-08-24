import prisma from './prisma.js'
import ZoomClient from "./zoom-client.js";

export async function getTotalHosts() {
    return prisma.count('host', { where: {enabled: true} })
}

export async function getOpenHosts() {
    return prisma.count('host', { where: {
        enabled: true,
        meetings: {
          every: { NOT: { endedAt: { equals: null }}}
        }
      }})
}

/*
* Returns the total number of currently active users (cau)
**/
export async function getCurrentlyActiveUsers() {
    const openCalls = await prisma.get("meeting", {
        where: {
            endedAt: null
        },
        include: { host: true }
    });

    let participants = await Promise.all(openCalls.map(async call => {
        const zoom = new ZoomClient({
            zoomSecret: call.host.apiSecret,
            zoomKey: call.host.apiKey 
        });

        const zoomMetrics = await zoom.get({
            path: `metrics/meetings/${call.zoomID}/participants`
        });

        return zoomMetrics.participants.filter(p => !Object.hasOwn(p, "leave_time")).length;
    }));

    return participants.reduce((acc, curr) => acc + curr, 0);

}