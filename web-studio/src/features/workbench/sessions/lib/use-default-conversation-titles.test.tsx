// @vitest-environment jsdom
import { useDefaultConversationTitles } from '#/features/workbench/sessions/lib/use-default-conversation-titles'
import {
  setSessionTitle,
  useSessionTitles,
} from '#/features/workbench/sessions/lib/use-session-titles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('#/features/workbench/sessions/lib/api', () => ({
  fetchSessionFirstTitle: mocks.fetch,
}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function mountTitles(scope: string, ids: string[]) {
  const client = new QueryClient()
  let renders = 0
  return renderHook(
    () => {
      // Fail fast on an update loop instead of starving the test timeout.
      if (++renders > 30) throw new Error('Title backfill did not settle')
      useDefaultConversationTitles(scope, ids)
      return useSessionTitles(scope)
    },
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  )
}

it('backfills the first user text without fetching or replacing a custom title', async () => {
  mocks.fetch.mockResolvedValue('First question')
  setSessionTitle('account', 'custom', 'My title')
  setSessionTitle('account', 'filesystem-draft', '新建文件系统会话')
  const { result } = mountTitles('account', [
    'missing',
    'filesystem-draft',
    'custom',
  ])
  await waitFor(() => {
    expect(result.current.getTitle('missing')).toBe('First question')
    expect(result.current.getTitle('filesystem-draft')).toBe('First question')
  })
  expect(result.current.getTitle('custom')).toBe('My title')
  expect(mocks.fetch).toHaveBeenCalledWith('missing')
  expect(mocks.fetch).toHaveBeenCalledWith('filesystem-draft')
  expect(mocks.fetch).toHaveBeenCalledTimes(2)
})

it.each([
  'New conversation',
  'New session',
  '新建对话',
  '新建工作台会话',
  '新建文件系统会话',
  'session-id',
])('settles when the first user text is %s', async (title) => {
  const scope = `title-${title}`
  mocks.fetch.mockResolvedValue(title)
  const { result, rerender } = mountTitles(scope, ['session-id'])
  await waitFor(() => expect(result.current.titles['session-id']).toBe(title))
  const snapshot = result.current.titles
  rerender()
  expect(result.current.titles).toBe(snapshot)
  expect(mocks.fetch).toHaveBeenCalledTimes(1)
})
