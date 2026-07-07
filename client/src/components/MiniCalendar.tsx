const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function buildMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  // Convert Sunday(0)-based getDay() to a Monday-first offset.
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(leadingBlanks).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function MonthGrid({ year, month, today }: { year: number; month: number; today: Date }) {
  const cells = buildMonthGrid(year, month);
  const label = new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 600, marginBottom: "0.3rem", opacity: 0.85 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", fontSize: "0.62rem" }}>
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i} style={{ opacity: 0.6, textAlign: "center" }}>
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          const isToday = isCurrentMonth && day === today.getDate();
          return (
            <div
              key={i}
              style={{
                textAlign: "center",
                padding: "2px 0",
                borderRadius: "3px",
                background: isToday ? "var(--color-accent)" : "transparent",
                fontWeight: isToday ? 700 : 400,
              }}
            >
              {day ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MiniCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const nextMonthDate = new Date(year, month + 1, 1);

  return (
    <div style={{ color: "#fff" }}>
      <MonthGrid year={year} month={month} today={today} />
      <MonthGrid year={nextMonthDate.getFullYear()} month={nextMonthDate.getMonth()} today={today} />
    </div>
  );
}
