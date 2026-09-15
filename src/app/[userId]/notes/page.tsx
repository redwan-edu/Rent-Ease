"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, CircleCheck, NotebookPen, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import Header from "@/components/Header";
import NoteSheet, { type NoteDraft } from "@/components/NoteSheet";
import { Empty, Segmented, SkeletonList, useRun } from "@/components/ui";
import { whenLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function NotesPage() {
  const { workspace, can, to } = useWorkspace();
  const [tab, setTab] = useState<"open" | "done">("open");
  const notes = useQuery(api.notes.list, { workspaceId: workspace.workspaceId, done: tab === "done" });
  const setDone = useMutation(api.notes.setDone);
  const { run } = useRun();
  // "/notes?new=1" opens the composer straight away.
  const [draft, setDraft] = useState<NoteDraft | null>(() =>
    new URLSearchParams(window.location.search).has("new") && can("edit") ? { body: "" } : null,
  );

  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", to("/notes"));
  }, [to]);

  return (
    <>
      <Header
        title="Notes"
        actions={
          can("edit") && (
            <button className="btn btn-sm btn-primary" onClick={() => setDraft({ body: "" })}>
              <Plus size={16} /> Add
            </button>
          )
        }
      />
      <div className="page">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "open", label: "To do" },
            { value: "done", label: "Done" },
          ]}
        />

        {!notes ? (
          <SkeletonList rows={3} />
        ) : notes.length === 0 ? (
          <div className="card">
            {tab === "open" ? (
              <Empty
                icon={<NotebookPen size={24} />}
                title="Nothing to do"
                text="Write down requests or jobs, like “fix the kitchen tap”, and set a reminder."
                action={
                  can("edit") && (
                    <button className="btn btn-primary btn-sm" onClick={() => setDraft({ body: "" })}>
                      <Plus size={16} /> Add note
                    </button>
                  )
                }
              />
            ) : (
              <Empty icon={<CircleCheck size={24} />} title="Nothing done yet" text="Notes you tick off show up here." />
            )}
          </div>
        ) : (
          <div className="card list">
            {notes.map((n) => {
              const due = n.fired && !n.done;
              const about = n.tenantName ?? n.propertyName;
              return (
                <div className={`note${n.done ? " done" : ""}`} key={n._id}>
                  <button
                    className={`check${n.done ? " on" : ""}`}
                    aria-label={n.done ? "Mark as to do" : "Mark as done"}
                    disabled={!can("edit")}
                    onClick={() =>
                      run(() => setDone({ noteId: n._id, done: !n.done }), n.done ? "Moved back to To do" : "Marked done")
                    }
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                  <button
                    className="note-main"
                    onClick={() =>
                      setDraft({ _id: n._id, body: n.body, tenantId: n.tenantId, propertyId: n.propertyId, remindAt: n.remindAt })
                    }
                  >
                    <div className="note-body">{n.body}</div>
                    <div className="note-meta">
                      {due && <span className="badge warn">Due</span>}
                      {n.remindAt && <span>{whenLabel(n.remindAt)}</span>}
                      {about && <span>{n.remindAt ? `· ${about}` : about}</span>}
                      {!n.remindAt && !about && (
                        <span>
                          {new Date(n._creationTime).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {draft && <NoteSheet note={draft} onClose={() => setDraft(null)} />}
    </>
  );
}
