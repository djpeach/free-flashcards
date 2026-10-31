import { describe, expect, it } from 'vitest'
import { detectDelimiter, parseDelimited, rowsToPairs, toDelimited } from '@/csv'

describe('csv', () => {
  it('detects tabs, commas, semicolons', () => {
    expect(detectDelimiter('a\tb\nc\td')).toBe('\t')
    expect(detectDelimiter('a,b\nc,d')).toBe(',')
    expect(detectDelimiter('a;b\nc;d')).toBe(';')
  })

  it('parses quotes, escaped quotes, embedded newlines, CRLF, and BOM', () => {
    const rows = parseDelimited('﻿front,back\r\n"hello, world","say ""hi""\nthere"\r\nx,y\r\n', ',')
    expect(rows).toEqual([
      ['front', 'back'],
      ['hello, world', 'say "hi"\nthere'],
      ['x', 'y'],
    ])
  })

  it('makes pairs and drops blank lines', () => {
    expect(rowsToPairs(parseDelimited('a\tb\n\n  \nc\td\te\n'))).toEqual([
      { front: 'a', back: 'b' },
      { front: 'c', back: 'd, e' },
    ])
  })

  it('round trips', () => {
    const pairs = [
      { front: 'a, "b"', back: 'line1\nline2' },
      { front: 'plain', back: 'text' },
    ]
    expect(rowsToPairs(parseDelimited(toDelimited(pairs), ','))).toEqual(pairs)
  })
})
