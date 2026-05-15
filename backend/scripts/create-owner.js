const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

function parseArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return null;
  return process.argv[index + 1];
}

async function main() {
  const email = parseArg("--email");
  const password = parseArg("--password");
  const wallet = parseArg("--wallet");

  if (!email || !password || !wallet) {
    console.error(
      "Usage: node scripts/create-owner.js --email <email> --password <password> --wallet <zig1...>"
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const walletOwner = await prisma.user.findUnique({
      where: { walletAddress: wallet },
      select: { email: true },
    });

    if (walletOwner && walletOwner.email !== email) {
      throw new Error(
        `Wallet already linked to another user: ${walletOwner.email}`
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const roles = ["platform_owner", "admin"];

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        walletAddress: wallet,
        passwordHash,
        roles,
        roleStatus: "APPROVED",
        requestedRole: null,
      },
      create: {
        email,
        walletAddress: wallet,
        passwordHash,
        roles,
        roleStatus: "APPROVED",
      },
    });

    console.log("Owner account ready:", {
      email: user.email,
      walletAddress: user.walletAddress,
      roles: user.roles,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to create owner:", error.message || error);
  process.exit(1);
});
