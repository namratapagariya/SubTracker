require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function clear() {
  await p.subscription.deleteMany();
  console.log("Subscriptions cleared");
  await p.$disconnect();
}

clear();