import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const prisma = new PrismaClient()

async function main() {
  const tables = ['User', 'Post', 'Like', 'Follow', 'Chat', 'Message', 'SavedPost', 'ReelComment', 'Notification'];
  for (const t of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "${t}" SET (schema_locked = false);`);
      console.log(`Unlocked table ${t}`);
    } catch (e: any) {
      console.log(`Notice for ${t}: ${e.message}`);
    }
  }

  const defaultPassword = hashPassword('password123')

  const mira = await prisma.user.upsert({
    where: { handle: 'mira.fieldnotes' },
    update: {
      email: 'mira@orbit.net',
      password: defaultPassword,
    },
    create: {
      username: 'Mira',
      handle: 'mira.fieldnotes',
      email: 'mira@orbit.net',
      password: defaultPassword,
      location: 'Reykjavík, Earth',
      color: 'green',
      avatarUrl: '🌿',
    },
  })

  const cassini = await prisma.user.upsert({
    where: { handle: 'cassini.collective' },
    update: {
      email: 'cassini@orbit.net',
      password: defaultPassword,
    },
    create: {
      username: 'Cassini',
      handle: 'cassini.collective',
      email: 'cassini@orbit.net',
      password: defaultPassword,
      location: 'Atacama Desert, Earth',
      color: 'orange',
      avatarUrl: '🪐',
    },
  })

  const bluehour = await prisma.user.upsert({
    where: { handle: 'bluehour.archive' },
    update: {
      email: 'bluehour@orbit.net',
      password: defaultPassword,
    },
    create: {
      username: 'Bluehour',
      handle: 'bluehour.archive',
      email: 'bluehour@orbit.net',
      password: defaultPassword,
      location: 'Pacific Ocean, Earth',
      color: 'blue',
      avatarUrl: '🌊',
    },
  })

  console.log('Database seeded with test accounts (password: password123)!')
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
