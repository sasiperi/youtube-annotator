export enum DateTimestampFormat {
  Unix = "epoch",
  ISO = "YYYY-MM-DDTHH-mm-ss",
  Underscore = "YYYY_MM_DD_HH_mm_ss",
  Compact = "YYYYMMDD-HHmmss",
  TimeOnly = "HH-mm-ss",
  None = "none",
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function generateDateTimestamp(
  format: DateTimestampFormat,
  now: Date = new Date()
): string {
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  const timeHMS = `${hours}-${minutes}-${seconds}`;
  const timeHMSCompact = `${hours}${minutes}${seconds}`;

  switch (format) {
    case DateTimestampFormat.ISO:
      // ISO-safe for filenames
      return now.toISOString().replace(/:/g, '-').split('.')[0];

    case DateTimestampFormat.Underscore:
      return `${year}_${month}_${day}_${hours}_${minutes}_${seconds}`;

    case DateTimestampFormat.Compact:
      return `${year}${month}${day}-${timeHMSCompact}`;

    case DateTimestampFormat.TimeOnly:
      return timeHMS;

    case DateTimestampFormat.None:
      return "";

    case DateTimestampFormat.Unix:
    default:
      return `${now.getTime()}`;
  }
}
