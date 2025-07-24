import { PrismaClient } from '@prisma/client';
import { createExtendedPrismaClient } from './app/services/prisma-extended.server.js';

const prisma = new PrismaClient();
const extendedPrisma = createExtendedPrismaClient(prisma);

// Test to see what models are available
console.log("Available Prisma models:", Object.keys(prisma));
console.log("Extended Prisma has inventoryLog:", 'inventoryLog' in extendedPrisma);

// Test specific model access
async function testModels() {
  try {
    console.log("Testing session model:", await prisma.session.count());
  } catch (e) {
    console.log("Session model error:", e.message);
  }
  
  try {
    console.log("Testing inventoryLog model:", await extendedPrisma.inventoryLog.count());
  } catch (e) {
    console.log("InventoryLog model error:", e.message);
  }
  
  await prisma.$disconnect();
}

testModels();
