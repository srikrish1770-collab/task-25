import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, ArrowUpRight } from "lucide-react";
import { domains, today, type Domain } from "../data/model";
import { save, useAppDispatch, useAppSelector } from "../app/store";
import { RecordForm } from "../components/Forms";
import { Badge, date, money } from "./Records";
export function Profile({
  domain,
  notify,
}: {
  domain: Domain;
  notify: (s: string) => void;
}) {
  const { id } = useParams();
  const db = useAppSelector((s) => s.crm);
  const dispatch = useAppDispatch();
  const record = db[domain].find((r) => r.id === id);
  const [edit, setEdit] = useState(false);
  const [follow, setFollow] = useState(false);
  if (!record)
    return (
      <div className="empty">
        <h1>Record not found</h1>
        <Link to={`/${domain}`}>Return to {domain}</Link>
      </div>
    );
  const related = domains.flatMap((d) =>
    db[d]
      .filter(
        (r) =>
          r.id !== id &&
          (r.linkedId === id ||
            r.customerId === id ||
            r.leadId === id ||
            (record.leadId !== undefined && r.linkedId === record.leadId)),
      )
      .map((r) => ({ domain: d, record: r })),
  );
  const parentId = record.customerId || record.linkedId;
  const parent = domains
    .flatMap((d) => db[d].map((r) => ({ domain: d, record: r })))
    .find((v) => v.record.id === parentId);
  return (
    <>
      <Link className="back-link" to={`/${domain}`}>
        Back to {domain}
      </Link>
      <div className="page-heading">
        <div>
          <h1>{record.name}</h1>
          <p>{record.company}</p>
        </div>
        <button className="primary" onClick={() => setEdit(true)}>
          Edit record
        </button>
      </div>
      <div className="profile-grid">
        <section className="card">
          <div className="profile-avatar">{record.name[0]}</div>
          <h2>{record.name}</h2>
          <Badge text={record.status} />
          <dl>
            <dt>Company</dt>
            <dd>{record.company || "Not provided"}</dd>
            <dt>Email</dt>
            <dd>{record.email || "Not provided"}</dd>
            <dt>Phone</dt>
            <dd>{record.phone || "Not provided"}</dd>
            <dt>Owner</dt>
            <dd>{record.owner}</dd>
            <dt>Address</dt>
            <dd>{record.address || "Not provided"}</dd>
            <dt>Value</dt>
            <dd>{money(record.value)}</dd>
            <dt>Created</dt>
            <dd>{date(record.createdAt)}</dd>
            <dt>Scheduled date</dt>
            <dd>{date(record.date)}</dd>
            {parent && (
              <>
                <dt>Linked record</dt>
                <dd>
                  <Link to={`/${parent.domain}/${parent.record.id}`}>
                    {parent.record.name} ?
                  </Link>
                </dd>
              </>
            )}
          </dl>
        </section>
        <div>
          <section className="card">
            <h3>Notes & context</h3>
            <p>{record.notes || "No notes yet."}</p>
            {record.outcome && (
              <p>
                <b>Outcome:</b> {record.outcome}
              </p>
            )}
            {domain === "activities" && (
              <button className="secondary" onClick={() => setFollow(true)}>
                <Plus size={16} />
                Create follow-up task
              </button>
            )}
          </section>
          <section className="card">
            <h3>Connected records & interaction timeline</h3>
            {related.length ? (
              related
                .sort((a, b) => b.record.date.localeCompare(a.record.date))
                .map(({ domain: d, record: r }) => (
                  <Link
                    className="timeline-item"
                    key={r.id}
                    to={`/${d}/${r.id}`}
                  >
                    <span className="timeline-dot" />
                    <div>
                      <small>
                        {d} - {date(r.date)}
                      </small>
                      <h4>{r.name}</h4>
                      <p>{r.notes}</p>
                      <Badge text={r.status} />
                    </div>
                    <ArrowUpRight size={17} />
                  </Link>
                ))
            ) : (
              <div className="empty compact">
                No connected records yet. Link a task, deal, or activity to see
                it here.
              </div>
            )}
          </section>
        </div>
      </div>
      {edit && (
        <RecordForm
          domain={domain}
          record={record}
          onClose={() => setEdit(false)}
          onSave={(r) => {
            dispatch(save({ domain, record: r }));
            setEdit(false);
            notify("Record updated");
          }}
        />
      )}
      {follow && (
        <RecordForm
          domain="tasks"
          record={{
            ...record,
            id: crypto.randomUUID(),
            name: `Follow up: ${record.name}`,
            status: "To Do",
            linkedId: record.linkedId,
            createdAt: new Date().toISOString(),
            date: today(),
          }}
          onClose={() => setFollow(false)}
          onSave={(r) => {
            dispatch(save({ domain: "tasks", record: r }));
            setFollow(false);
            notify("Follow-up task created");
          }}
        />
      )}
    </>
  );
}
