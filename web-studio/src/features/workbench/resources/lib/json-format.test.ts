import { describe, expect, it, vi } from 'vitest'

import { formatJsonContent } from '#/features/workbench/resources/lib/json-format'

describe('formatJsonContent', () => {
  it('adds indentation and line breaks to compact JSON', () => {
    expect(formatJsonContent('{"items":[{"id":1},{"id":2}]}')).toBe(
      [
        '{',
        '  "items": [',
        '    {',
        '      "id": 1',
        '    },',
        '    {',
        '      "id": 2',
        '    }',
        '  ]',
        '}',
      ].join('\n'),
    )
  })

  it.each([
    '9007199254740993',
    '1e400',
    '1e-400',
    '-0',
    '0.123456789012345678901',
  ])('preserves the original number token %s', (number) => {
    expect(formatJsonContent(`{"value":${number}}`)).toBe(
      `{\n  "value": ${number}\n}`,
    )
  })

  it('preserves escaped strings, duplicate keys, and key order', () => {
    expect(
      formatJsonContent(String.raw`{"2":"\u0041","1":"[,{}:]","2":"\\\""}`),
    ).toBe(
      [
        '{',
        String.raw`  "2": "\u0041",`,
        '  "1": "[,{}:]",',
        String.raw`  "2": "\\\""`,
        '}',
      ].join('\n'),
    )
  })

  it.each(['{}', '[]', 'true', 'null', '"a b"'])(
    'formats the root value %s',
    (value) => expect(formatJsonContent(` \t${value}\n`)).toBe(value),
  )

  it('throws for invalid JSON', () => {
    expect(() => formatJsonContent('{"invalid"}')).toThrow()
  })
})

it('returns unchanged numeric literals through the formatting worker', async () => {
  const worker = {
    onmessage: undefined as ((event: MessageEvent) => void) | undefined,
    postMessage: vi.fn(),
  }
  vi.stubGlobal('self', worker)
  try {
    await import('./json-format.worker')
    worker.onmessage?.({
      data: { content: '{"id":9007199254740993,"weight":1e400}' },
    } as MessageEvent)
    expect(worker.postMessage).toHaveBeenCalledWith({
      content: '{\n  "id": 9007199254740993,\n  "weight": 1e400\n}',
      error: null,
    })
    worker.onmessage?.({ data: { content: '{"invalid"}' } } as MessageEvent)
    expect(worker.postMessage).toHaveBeenLastCalledWith({
      content: '{"invalid"}',
      error: expect.any(String),
    })
  } finally {
    vi.unstubAllGlobals()
  }
})
