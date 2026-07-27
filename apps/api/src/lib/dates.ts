import { DateTime } from "luxon";

export function analyticsWindow(start: string, end: string, timezone = "America/Sao_Paulo") {
  const startAt = DateTime.fromISO(start, { zone: timezone }).startOf("day");
  const endExclusive = DateTime.fromISO(end, { zone: timezone }).startOf("day").plus({ days: 1 });

  if (!startAt.isValid || !endExclusive.isValid) throw new Error("Período inválido.");
  if (endExclusive <= startAt) throw new Error("A data final deve ser igual ou posterior à inicial.");
  if (endExclusive.diff(startAt, "days").days > 370) throw new Error("O período máximo é de 370 dias.");

  return {
    startAt: startAt.toUTC().toJSDate(),
    endExclusive: endExclusive.toUTC().toJSDate(),
    timezone
  };
}

export function todayIn(timezone = "America/Sao_Paulo") {
  const day = DateTime.now().setZone(timezone).toISODate()!;
  return analyticsWindow(day, day, timezone);
}
