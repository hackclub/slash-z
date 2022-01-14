// msw: I'm running into a similar issue to what's described here: https://github.com/prisma/prisma/issues/7644
// I've tried batching uploads 

import prisma from '../api/prisma.js'

const batch = (arr, size) => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size)
    )
}

export default async ({table, airtableRecords, transform, startTS}) => {
  // I wasn't having issues with uploads of up to 1000 records, so don't chunk them
  const chunkSize = airtableRecords.length < 1000 ? 1000 : 100

  const batches = batch(airtableRecords, chunkSize)

  let progress = 0
  for await (const chunk of batches) {
    const result = await prisma.client[table].createMany({
      skipDuplicates: true,
      data: chunk.map(airtableRecord => transform(airtableRecord))
    })
    await new Promise(resolve => setTimeout(resolve, 1000))
    progress += result.count

    console.log(`[${startTS}] Created ${progress}/${airtableRecords.length} ${table}(s)`)
  }
  return progress
}
