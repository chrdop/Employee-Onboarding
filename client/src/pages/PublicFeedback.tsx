import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FeedbackState } from "../types";

interface PublicFeedbackInfo {
  taskTitle: string;
  taskDescription: string | null;
  location: string;
  employeeName: string;
  externalContactName: string | null;
  status: FeedbackState;
  respondedAt: string | null;
}

export function PublicFeedback() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<PublicFeedbackInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/feedback/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(setInfo)
      .catch(() => setNotFound(true));
  }, [token]);

  async function respond(status: FeedbackState) {
    setError(null);
    try {
      const res = await fetch(`/api/public/feedback/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError("Could not submit your response. Please try again.");
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: 420 }}>
        <h2 style={{ marginTop: 0 }}>Onboarding task feedback</h2>
        {notFound && <p className="error-text">This link is invalid or has expired.</p>}
        {info && !submitted && (
          <>
            <p>
              <strong>{info.taskTitle}</strong>
              {info.taskDescription ? ` — ${info.taskDescription}` : ""}
            </p>
            <p className="muted">
              Location: {info.location} &middot; Employee: {info.employeeName}
            </p>
            <p>
              Current status: <strong>{info.status}</strong>
            </p>
            <p>Please confirm the current status of this task from your side:</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn" onClick={() => respond("done")}>
                Done
              </button>
              <button className="btn secondary" onClick={() => respond("open")}>
                Still open
              </button>
              <button className="btn secondary" onClick={() => respond("overdue")}>
                Delayed
              </button>
            </div>
            {error && <div className="error-text" style={{ marginTop: "0.75rem" }}>{error}</div>}
          </>
        )}
        {submitted && <p>Thank you, your feedback has been recorded.</p>}
      </div>
    </div>
  );
}
