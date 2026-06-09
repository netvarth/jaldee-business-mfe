export function cn(...inputs: any[]) {
  return inputs
    .flatMap(input => {
      if (!input) return [];
      if (typeof input === 'string' || typeof input === 'number') return [input];
      if (Array.isArray(input)) return [cn(...input)];
      if (typeof input === 'object') {
        return Object.keys(input).filter(key => !!input[key]);
      }
      return [];
    })
    .filter(Boolean)
    .join(' ');
}
