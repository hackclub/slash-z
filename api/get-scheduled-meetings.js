import prisma from "./prisma.js"

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
      hostKey: {isEmpty: false},
      schedulingLinkId: link.id
    }
    const meeting = await prisma.find('meeting', {where: meetingWhere})
    return { meeting, link }
  }))
  
  return meetings
}