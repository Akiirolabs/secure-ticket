export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Ticket = {
  id: string;
  title: string;
  description: string;
  severity: TicketSeverity;
  status: TicketStatus;
  createdBy: string;
  assignedTo: string;
  system: string;
  updatedAt: string;
};

export const tickets: Ticket[] = [
  {
    id: "INC-24091",
    title: "Privileged token replay detected",
    description:
      "Repeated access attempts from a previously trusted session token were blocked by the edge gateway.",
    severity: "CRITICAL",
    status: "IN_PROGRESS",
    createdBy: "M. Chen",
    assignedTo: "Identity Response",
    system: "Access Fabric",
    updatedAt: "4 min ago"
  },
  {
    id: "INC-24087",
    title: "Ticket sync latency above policy",
    description:
      "Regional queue replication is delayed beyond the corporate incident response objective.",
    severity: "HIGH",
    status: "OPEN",
    createdBy: "R. Patel",
    assignedTo: "Platform SRE",
    system: "Case Mesh",
    updatedAt: "13 min ago"
  },
  {
    id: "INC-24073",
    title: "Analyst role update pending review",
    description:
      "Role escalation request requires admin approval before production access is granted.",
    severity: "MEDIUM",
    status: "OPEN",
    createdBy: "A. Rivera",
    assignedTo: "IAM Governance",
    system: "Role Vault",
    updatedAt: "31 min ago"
  },
  {
    id: "INC-24068",
    title: "Audit stream checkpoint recovered",
    description:
      "Audit collector resumed after checkpoint drift. No events lost during recovery.",
    severity: "LOW",
    status: "RESOLVED",
    createdBy: "S. Okafor",
    assignedTo: "Observability",
    system: "Signal Archive",
    updatedAt: "1 hr ago"
  }
];

export const activity = [
  "Permission denied logged for user_812 on DELETE /tickets/INC-24087",
  "Controller succeeded: UPDATE_TICKET_STATUS in 42ms",
  "Request completed PATCH /tickets/INC-24091 with status 200",
  "Validation failed on CREATE_TICKET: title is required"
];
