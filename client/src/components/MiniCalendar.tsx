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
  const label = new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="mini-calendar-month">
      <div className="mini-calendar-title">{label}</div>
      <div className="mini-calendar-grid">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i} className="mini-calendar-weekday">
            {w}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={`mini-calendar-day${isCurrentMonth && day === today.getDate() ? " today" : ""}`}
          >
            {day ?? ""}
          </div>
        ))}
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
    <div className="mini-calendar">
      <MonthGrid year={year} month={month} today={today} />
      <MonthGrid year={nextMonthDate.getFullYear()} month={nextMonthDate.getMonth()} today={today} />
    </div>
  );
}
