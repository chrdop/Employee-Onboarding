import { FormEvent, useEffect, useState } from "react";
import { api } from "../../api/client";

export function SetupSettings() {
  const [dailyReportSendTime, setDailyReportSendTime] = useState("07:00");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<Record<string, string>>("/settings").then((s) => {
      if (s.daily_report_send_time) setDailyReportSendTime(s.daily_report_send_time);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await api.put("/settings/daily_report_send_time", { value: dailyReportSendTime });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <h3>System settings</h3>
      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 320 }}>
        <div className="form-field">
          <label htmlFor="sendTime">Daily report send time</label>
          <input
            id="sendTime"
            type="time"
            value={dailyReportSendTime}
            onChange={(e) => setDailyReportSendTime(e.target.value)}
          />
        </div>
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          Currently used for reference only — the daily report is viewable in-app any time. Email delivery at this
          time is a planned next step once email/Teams sending is enabled.
        </p>
        <button className="btn" type="submit">
          Save
        </button>
        {saved && <span style={{ marginLeft: "0.75rem" }} className="muted">Saved.</span>}
      </form>
    </div>
  );
}
