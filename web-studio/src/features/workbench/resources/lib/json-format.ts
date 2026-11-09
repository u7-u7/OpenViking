export interface JsonFormatRequest {
  content: string
}

export interface JsonFormatResponse {
  content: string
  error: string | null
}

export function formatJsonContent(content: string): string {
  // Validate with the native parser, but format source tokens so numbers,
  // escape sequences, and object members are not changed by a JS round trip.
  JSON.parse(content)
  const tokens = content.match(/"(?:[^"\\]|\\.)*"|[{}[\],:]|[^\s{}[\],:]+/g)!
  let depth = 0
  const newline = () => `\n${'  '.repeat(depth)}`

  return tokens
    .map((token, index) => {
      if (token === '{' || token === '[') {
        depth += 1
        const next = tokens[index + 1]
        return token + (next === '}' || next === ']' ? '' : newline())
      }
      if (token === '}' || token === ']') {
        depth -= 1
        const previous = tokens[index - 1]
        return (previous === '{' || previous === '[' ? '' : newline()) + token
      }
      if (token === ',') return token + newline()
      if (token === ':') return ': '
      return token
    })
    .join('')
}
