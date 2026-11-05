import { expandCalendar, civilDay, civilInstant } from "./calendar";
import type { CalendarDTO } from "./types";
export function restrictCalendarFrom(
  calendar: CalendarDTO,
  availableAt: string,
  asOf: string,
): CalendarDTO {
  const end = Date.parse(asOf) + 90 * 86400000;
  const windows = expandCalendar(calendar, asOf, new Date(end).toISOString());
  const first = Date.parse(`${civilDay(asOf)}T00:00:00Z`);
  const exceptions: CalendarDTO["exceptions"] = [];
  for (let day = first; day <= end + 86400000; day += 86400000) {
    const date = new Date(day).toISOString().slice(0, 10),
      start = civilInstant(date, 0),
      finish = civilInstant(date, 1440);
    const intervals = windows
      .flatMap((w) => {
        const s = Math.max(start, Date.parse(w.start), Date.parse(availableAt)),
          e = Math.min(finish, Date.parse(w.end));
        return e > s
          ? [
              {
                startMinute: Math.ceil((s - start) / 60000),
                endMinute: Math.floor((e - start) / 60000),
              },
            ]
          : [];
      })
      .filter((w) => w.endMinute > w.startMinute);
    exceptions.push({ date, intervals });
  }
  return { ...calendar, weekly: [], exceptions };
}
