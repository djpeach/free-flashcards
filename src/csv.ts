export type Delimiter = '\t' | ',' | ';'

export function detectDelimiter(text: string): Delimiter {
  const sample = text.split(/\r?\n/).slice(0, 20).join('\n')
  const count = (ch: string) => sample.split(ch).length - 1
  if (count('\t') > 0) return '\t'
  return count(';') > count(',') ? ';' : ','
}

export function parseDelimited(text: string, delimiter: Delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let i = 0
  const src = text.replace(/^﻿/, '')
  while (i < src.length) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        quoted = false
      } else field += ch
      i++
      continue
    }
    if (ch === '"' && field === '') {
      quoted = true
    } else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
    i++
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

export function rowsToPairs(rows: string[][]): { front: string; back: string }[] {
  return rows
    .map((r) => ({ front: (r[0] ?? '').trim(), back: r.slice(1).join(', ').trim() }))
    .filter((p) => p.front || p.back)
}

function escapeField(v: string, delimiter: string): string {
  return /["\n\r]/.test(v) || v.includes(delimiter) ? `"${v.replace(/"/g, '""')}"` : v
}

export function toDelimited(pairs: { front: string; back: string }[], delimiter: Delimiter = ','): string {
  return pairs.map((p) => [p.front, p.back].map((f) => escapeField(f, delimiter)).join(delimiter)).join('\n')
}
