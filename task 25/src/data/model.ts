export const stages = [
  "Prospecting",
  "Qualification",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];
export const owners = [
  "Alex Morgan",
  "Sarah Chen",
  "James Wilson",
  "Olivia Brooks",
];
export const statuses = {
  leads: ["New", "Contacted", "Qualified", "Unqualified", "Converted"],
  customers: ["Active", "Inactive"],
  deals: stages,
  tasks: ["To Do", "In Progress", "Completed"],
  activities: ["Call", "Meeting", "Email (logged)", "Note", "Follow-up"],
};
export type Domain = keyof typeof statuses;
export interface RecordItem {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  owner: string;
  status: string;
  value: number;
  notes: string;
  createdAt: string;
  date: string;
  priority: string;
  linkedId: string;
  address: string;
  outcome: string;
  customerId?: string;
  leadId?: string;
}
export type Database = Record<Domain, RecordItem[]>;
export const domains: Domain[] = [
  "leads",
  "customers",
  "deals",
  "tasks",
  "activities",
];
export const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};
export const emptyRecord = (domain: Domain): RecordItem => ({
  id: crypto.randomUUID(),
  name: "",
  company: "",
  email: "",
  phone: "",
  source: "Website",
  owner: owners[0],
  status: statuses[domain][0],
  value: 0,
  notes: "",
  createdAt: new Date().toISOString(),
  date: today(),
  priority: "Medium",
  linkedId: "",
  address: "",
  outcome: "",
});
export function seed(): Database {
  const db: Database = {
    leads: [],
    customers: [],
    deals: [],
    tasks: [],
    activities: [],
  };
  const companies = [
    "Acme Technologies",
    "Linear Labs",
    "Northstar Health",
    "Vercel Studio",
    "Orbit Financial",
    "Focal Design",
    "Lumina Energy",
    "Apex Logistics",
    "Notion Works",
    "Sonder Retail",
    "Atlas Systems",
    "Evergreen Group",
  ];
  companies.forEach((company, i) => {
    const base = {
      ...emptyRecord("leads"),
      id: `lead-${i}`,
      name: [
        "Ethan Carter",
        "Sophia Martinez",
        "Liam Anderson",
        "Emma Thompson",
        "Noah Williams",
        "Ava Robinson",
      ][i % 6],
      company,
      email: `${["ethan", "sophia", "liam", "emma", "noah", "ava"][i % 6]}@${company.split(" ")[0].toLowerCase()}.com`,
      phone: `+1 415 555 ${String(1200 + i)}`,
      owner: owners[i % 4],
      createdAt: new Date(Date.now() - i * 3 * 86400000).toISOString(),
      value: (i + 2) * 4500,
      status: statuses.leads[i % 4],
      source: ["Website", "Referral", "LinkedIn", "Event"][i % 4],
      notes:
        "Interested in scaling their customer operations. Follow up with a tailored solution.",
    };
    db.leads.push(base);
    if (i < 8) {
      const customer = {
        ...base,
        id: `customer-${i}`,
        status: "Active",
        address: `${120 + i} Market Street, San Francisco, CA`,
        leadId: base.id,
      };
      db.customers.push(customer);
      db.deals.push({
        ...base,
        id: `deal-${i}`,
        name: [
          "Enterprise expansion",
          "Annual platform license",
          "Team onboarding",
          "Growth partnership",
        ][i % 4],
        customerId: customer.id,
        status: stages[i % 6],
        date: new Date(Date.now() + (i - 2) * 86400000 * 4)
          .toISOString()
          .slice(0, 10),
        priority: ["High", "Medium", "Low"][i % 3],
      });
    }
    db.tasks.push({
      ...base,
      id: `task-${i}`,
      name: [
        "Prepare enterprise proposal",
        "Follow up on discovery call",
        "Schedule product walkthrough",
        "Review contract terms",
      ][i % 4],
      linkedId: i < 8 ? `customer-${i}` : base.id,
      status: i % 4 === 0 ? "Completed" : i % 3 === 0 ? "In Progress" : "To Do",
      priority: ["High", "Medium", "Low", "Urgent"][i % 4],
      date: new Date(Date.now() + (i - 3) * 86400000)
        .toISOString()
        .slice(0, 10),
    });
    if (i < 6)
      db.activities.push({
        ...base,
        id: `activity-${i}`,
        name: [
          "Discovery call completed",
          "Product demo with stakeholders",
          "Pricing proposal reviewed",
        ][i % 3],
        status: statuses.activities[i % 5],
        linkedId: `customer-${i}`,
        date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 16),
        outcome: "Positive discussion. Agreed on next steps.",
      });
  });
  return db;
}
