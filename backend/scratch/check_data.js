const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('--- Checking Events ---');
    const events = await prisma.event.findMany();
    console.log(`Total Events: ${events.length}`);
    if (events.length > 0) {
      console.table(events.map(e => ({ id: e.id, title: e.title, venue: e.venue })));
    }

    console.log('\n--- Checking Tickets ---');
    const tickets = await prisma.ticket.findMany();
    console.log(`Total Tickets: ${tickets.length}`);
    if (tickets.length > 0) {
      console.table(tickets.map(t => ({ id: t.id, name: t.attendee_name, status: t.status })));
    }
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
