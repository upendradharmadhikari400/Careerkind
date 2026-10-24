export function mergeSubjects(selected: string[], other: string) {
  return [...new Set([...selected, ...other.split(/[,\n]/).map(s => s.trim()).filter(Boolean)])].join(', ');
}