const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Wiping all media (Posts, Stories, Comments, SavedPosts)...');
  await prisma.savedPost.deleteMany({});
  await prisma.reelComment.deleteMany({});
  await prisma.storyView.deleteMany({});
  await prisma.story.deleteMany({});
  await prisma.like.deleteMany({});
  await prisma.post.deleteMany({});
  console.log('Successfully wiped all media.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
