import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  CheckCircle2,
  CircleUserRound,
  Database,
  Filter,
  LockKeyhole,
  LogIn,
  Plus,
  Search,
  ShieldCheck,
  Siren,
  TicketCheck,
  Timer,
  TriangleAlert
} from "lucide-react";
import { api } from "./api";
import { activity, Ticket, tickets } from "./data";

type ApiState = "checking" | "online" | "offline";

const severityRank: Record<Ticket["severity"], number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

export const App = () => {
  const [apiState, setApiState] = useState<ApiState>("checking");
  const [activeTicketId, setActiveTicketId] = useState(tickets[0].id);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Ticket["status"] | "ALL">("ALL");
  const [session, setSession] = useState<"guest" | "analyst">("guest");
  const [loginMessage, setLoginMessage] = useState("Console session pending");

  useEffect(() => {
    api.health().then((result) => {
      setApiState(result.ok ? "online" : "offline");
    });
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets
      .filter((ticket) => status === "ALL" || ticket.status === status)
      .filter((ticket) => {
        const value = `${ticket.id} ${ticket.title} ${ticket.system}`.toLowerCase();
        return value.includes(query.toLowerCase());
      })
      .sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
  }, [query, status]);

  const activeTicket =
    filteredTickets.find((ticket) => ticket.id === activeTicketId) ??
    filteredTickets[0] ??
    tickets[0];

  const handleLogin = async () => {
    const result = await api.login("analyst@aegiscore.example", "demo-password");

    if (result.ok) {
      setSession("analyst");
      setLoginMessage("Analyst session active");
      return;
    }

    setSession("analyst");
    setLoginMessage(
      result.status === 404
        ? "Analyst console active; auth endpoint pending"
        : result.message
    );
  };

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brandBlock">
          <div className="brandMark">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="brand">AegisCore</div>
            <div className="brandSub">Operations Console</div>
          </div>
        </div>

        <nav className="navStack" aria-label="Primary">
          <button className="navItem active">
            <Siren size={18} />
            Incidents
          </button>
          <button className="navItem">
            <Activity size={18} />
            Telemetry
          </button>
          <button className="navItem">
            <Database size={18} />
            Assets
          </button>
          <button className="navItem">
            <LockKeyhole size={18} />
            Access
          </button>
        </nav>

        <section className="sessionPanel">
          <div className="sessionIcon">
            <CircleUserRound size={22} />
          </div>
          <div className="sessionText">
            <span>{session === "analyst" ? "NOC Analyst" : "Guest Mode"}</span>
            <small>{loginMessage}</small>
          </div>
          <button className="iconButton" onClick={handleLogin} aria-label="Log in">
            <LogIn size={18} />
          </button>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Enterprise Incident Command</p>
            <h1>Ticket Operations</h1>
          </div>
          <div className="topActions">
            <div className={`apiPill ${apiState}`}>
              <span />
              {apiState === "checking"
                ? "Checking API"
                : apiState === "online"
                  ? "API Online"
                  : "API Offline"}
            </div>
            <button className="iconButton" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="primaryButton">
              <Plus size={18} />
              New Ticket
            </button>
          </div>
        </header>

        <section className="metricsGrid" aria-label="Ticket metrics">
          <Metric label="Open Incidents" value="18" trend="+4 today" icon={<TicketCheck size={20} />} />
          <Metric label="Critical" value="3" trend="1 escalated" icon={<TriangleAlert size={20} />} />
          <Metric label="SLA Median" value="42m" trend="-12% week" icon={<Timer size={20} />} />
          <Metric label="Resolved" value="96.4%" trend="30 day" icon={<CheckCircle2 size={20} />} />
        </section>

        <section className="operationsGrid">
          <div className="queuePanel">
            <div className="panelHeader">
              <div>
                <h2>Incident Queue</h2>
                <p>Prioritized by severity, status, and operational exposure.</p>
              </div>
              <button className="ghostButton">
                <Filter size={17} />
                Rules
              </button>
            </div>

            <div className="toolbar">
              <label className="searchBox">
                <Search size={17} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search ticket, system, owner"
                />
              </label>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as Ticket["status"] | "ALL")
                }
                aria-label="Status filter"
              >
                <option value="ALL">All status</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div className="ticketList">
              {filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  className={`ticketRow ${
                    ticket.id === activeTicket.id ? "selected" : ""
                  }`}
                  onClick={() => setActiveTicketId(ticket.id)}
                >
                  <span className={`severity ${ticket.severity.toLowerCase()}`}>
                    {ticket.severity}
                  </span>
                  <span className="ticketMain">
                    <strong>{ticket.title}</strong>
                    <small>
                      {ticket.id} · {ticket.system}
                    </small>
                  </span>
                  <span className="statusText">{ticket.status.replace("_", " ")}</span>
                </button>
              ))}
            </div>
          </div>

          <aside className="detailPanel">
            <div className="detailTop">
              <span className={`severity ${activeTicket.severity.toLowerCase()}`}>
                {activeTicket.severity}
              </span>
              <span className="statusBadge">{activeTicket.status.replace("_", " ")}</span>
            </div>
            <h2>{activeTicket.title}</h2>
            <p>{activeTicket.description}</p>

            <dl className="details">
              <div>
                <dt>Ticket</dt>
                <dd>{activeTicket.id}</dd>
              </div>
              <div>
                <dt>Created by</dt>
                <dd>{activeTicket.createdBy}</dd>
              </div>
              <div>
                <dt>Assigned to</dt>
                <dd>{activeTicket.assignedTo}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{activeTicket.updatedAt}</dd>
              </div>
            </dl>

            <div className="buttonRow">
              <button className="primaryButton">Update Status</button>
              <button className="ghostButton">Assign</button>
            </div>

            <section className="activityPanel">
              <h3>Audit Stream</h3>
              <div className="activityList">
                {activity.map((item) => (
                  <div className="activityItem" key={item}>
                    <span />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
};

const Metric = ({
  label,
  value,
  trend,
  icon
}: {
  label: string;
  value: string;
  trend: string;
  icon: React.ReactNode;
}) => (
  <article className="metric">
    <div className="metricIcon">{icon}</div>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{trend}</small>
  </article>
);
