import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const mira = await prisma.user.upsert({
    where: { handle: 'mira.fieldnotes' },
    update: {},
    create: {
      username: 'Mira',
      handle: 'mira.fieldnotes',
      location: 'Reykjavík, Earth',
      color: 'green',
      avatarUrl: '🌿',
    },
  })

  const cassini = await prisma.user.upsert({
    where: { handle: 'cassini.collective' },
    update: {},
    create: {
      username: 'Cassini',
      handle: 'cassini.collective',
      location: 'Atacama Desert, Earth',
      color: 'orange',
      avatarUrl: '🪐',
    },
  })

  const bluehour = await prisma.user.upsert({
    where: { handle: 'bluehour.archive' },
    update: {},
    create: {
      username: 'Bluehour',
      handle: 'bluehour.archive',
      location: 'Pacific Ocean, Earth',
      color: 'blue',
      avatarUrl: '🌊',
    },
  })

  await prisma.post.create({
    data: {
      content: 'First light over the lava fields. Sending this color palette to whoever is listening beyond the atmosphere.',
      mediaType: 'aurora',
      channel: 'earth',
      authorId: mira.id,
    },
  })

  await prisma.post.create({
    data: {
      content: 'A dry valley that looks suspiciously like a future landing site. Mars channel opens when the relay is stable.',
      mediaType: 'mars-landscape',
      channel: 'earth',
      authorId: cassini.id,
    },
  })

  await prisma.post.create({
    data: {
      content: 'The ocean is still Earth\'s most convincing proof that there is more beneath the surface.',
      mediaType: 'ocean',
      channel: 'earth',
      authorId: bluehour.id,
    },
  })

  console.log('Database seeded!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
