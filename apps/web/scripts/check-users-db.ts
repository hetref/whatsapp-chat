import { prisma } from '@repo/db';

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  console.log(`Total users in DB: ${users.length}`);

  const nullEmails = users.filter((u) => !u.email);
  console.log(`Users with NULL email: ${nullEmails.length}`);

  const emailCounts = new Map<string, number>();
  for (const u of users) {
    if (u.email) {
      emailCounts.set(u.email, (emailCounts.get(u.email) || 0) + 1);
    }
  }

  const duplicates = Array.from(emailCounts.entries()).filter(([_, count]) => count > 1);
  console.log(`Duplicate emails count: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log('Duplicates:', duplicates);
  }
}

checkUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
