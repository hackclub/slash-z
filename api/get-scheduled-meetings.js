import prisma from "./prisma.js"

/**
* Get scheduled meetings
* @function
* @param {string} user - The slack ID of the user
* @returns {Promise<Object[]>}
*/
export default async function(user) {
  const linksWhere = {
    creatorSlackID: user,
    meetings: {
      some: {
        endedAt: {
          equals: null,
        }
      }
    }
  }
  const links = await prisma.get('schedulingLink', {where: linksWhere})

  const meetings = await Promise.all(links.map(async link => {

    let meetingWhere = {
      endedAt: {equals: null},
      hostKey: {not: null},
      schedulingLinkId: link.id
    }
    const meeting = await prisma.find('meeting', {where: meetingWhere})
    return { meeting, link }
  }))
  
  return meetings
}