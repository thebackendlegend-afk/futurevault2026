export type CountdownParts = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

export function getCountdown(target: Date | string): CountdownParts {
  const t = typeof target === "string" ? new Date(target) : target;
  let diff = Math.max(0, t.getTime() - Date.now());
  const done = diff === 0;
  const SEC = 1000, MIN = 60 * SEC, HR = 60 * MIN, DAY = 24 * HR;
  const YEAR = 365.2425 * DAY;
  const MONTH = YEAR / 12;
  const years = Math.floor(diff / YEAR); diff -= years * YEAR;
  const months = Math.floor(diff / MONTH); diff -= months * MONTH;
  const days = Math.floor(diff / DAY); diff -= days * DAY;
  const hours = Math.floor(diff / HR); diff -= hours * HR;
  const minutes = Math.floor(diff / MIN); diff -= minutes * MIN;
  const seconds = Math.floor(diff / SEC);
  return { years, months, days, hours, minutes, seconds, done };
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
