export function format(dateInput: Date | string | number, formatStr: string): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const pad = (n: number) => n.toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const MMM = months[date.getMonth()];
  const MMMM = fullMonths[date.getMonth()];
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  let result = formatStr;
  result = result.replace(/yyyy/g, String(yyyy));
  result = result.replace(/yy/g, String(yyyy).slice(-2));
  result = result.replace(/MMMM/g, MMMM);
  result = result.replace(/MMM/g, MMM);
  result = result.replace(/MM/g, MM);
  result = result.replace(/dd/g, dd);
  result = result.replace(/d/g, String(date.getDate()));
  result = result.replace(/HH/g, HH);
  result = result.replace(/mm/g, mm);
  result = result.replace(/ss/g, ss);

  return result;
}

export function formatDistanceToNow(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function addDays(date: Date | string | number, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function subDays(date: Date | string | number, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

export function subHours(date: Date | string | number, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() - hours);
  return result;
}
