import argon2 from "argon2";
import { PrismaClient, Role, TicketSeverity, TicketStatus } from "@prisma/client";

const prisma = new PrismaClient();

const demoEmail = "analyst@aegiscore.example";
const demoPassword = "demo-password";
const adminEmail = "admin@aegiscore.example";
const adminPassword = "admin-password";

const seed = async () => {
  const passwordHash = await argon2.hash(demoPassword);
  const analyst = await prisma.user.upsert({
    where: { email: demoEmail },
    update: { passwordHash, role: Role.ANALYST },
    create: {
      email: demoEmail,
      passwordHash,
      role: Role.ANALYST
    }
  });
  const adminPasswordHash = await argon2.hash(adminPassword);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminPasswordHash, role: Role.ADMIN },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: Role.ADMIN
    }
  });

  const tickets = [
    {
      id: "INC-24087",
      title: "Database cluster latency spike",
      system: "Payments Engine",
      severity: TicketSeverity.CRITICAL,
      status: TicketStatus.OPEN,
      assignedTo: "NOC Analyst",
      description:
        "A latency spike has been detected in the payments cluster affecting transaction throughput."
    },
    {
      id: "INC-24091",
      title: "Login auth failures reported",
      system: "Identity Service",
      severity: TicketSeverity.HIGH,
      status: TicketStatus.IN_PROGRESS,
      assignedTo: "Auth Team",
      description:
        "Users are reporting intermittent login failures with 401 responses. Investigation is underway."
    },
    {
      id: "INC-24096",
      title: "API gateway TLS renewal pending",
      system: "Gateway",
      severity: TicketSeverity.MEDIUM,
      status: TicketStatus.RESOLVED,
      assignedTo: "NOC Analyst",
      description:
        "A certificate renewal is pending on the API gateway cluster and monitoring is in place."
    }
  ];

  for (const ticket of tickets) {
    await prisma.ticket.upsert({
      where: { id: ticket.id },
      update: {},
      create: {
        ...ticket,
        createdById: analyst.id
      }
    });
  }
};

seed()
  .then(() => {
    console.log(`Seeded analyst ${demoEmail}, admin ${adminEmail}, and starter tickets.`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
