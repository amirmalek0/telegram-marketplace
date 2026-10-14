import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startTicketPolling, TICKET_POLL_INTERVAL } from '../src/features/tickets/ticketPolling.ts'

const flush = async () => { await Promise.resolve(); await Promise.resolve() }
const thread = { ticket: { id: 'ticket-1', status: 'open' }, messages: [] }

function setup(t, fetchTicket) {
  t.mock.timers.enable({ apis: ['setInterval'] })
  const updates = [], loading = [], errors = []
  const poller = startTicketPolling({
    fetchTicket,
    onUpdate: value => updates.push(value),
    onLoading: value => loading.push(value),
    onLoadError: value => errors.push(value),
  })
  t.after(() => poller.stop())
  return { poller, updates, loading, errors }
}

test('loads immediately, then every 5 seconds without showing loading again', async t => {
  let calls = 0
  const state = setup(t, async () => { calls++; return thread })
  await flush()
  assert.equal(calls, 1)
  t.mock.timers.tick(4999)
  assert.equal(calls, 1)
  t.mock.timers.tick(1)
  await flush()
  assert.equal(calls, 2)
  t.mock.timers.tick(TICKET_POLL_INTERVAL)
  await flush()
  assert.equal(calls, 3)
  assert.equal(state.loading.filter(Boolean).length, 1)
  assert.equal(state.updates.length, 3)
})

test('does not overlap slow requests and aborts on leaving the page', async t => {
  let calls = 0, signal, resolve
  const state = setup(t, s => {
    calls++; signal = s
    return new Promise(done => { resolve = done })
  })
  t.mock.timers.tick(15000)
  assert.equal(calls, 1)
  state.poller.stop()
  assert.equal(signal.aborted, true)
  resolve(thread)
  await flush()
  assert.equal(state.updates.length, 0)
  t.mock.timers.tick(10000)
  assert.equal(calls, 1)
})

test('keeps the conversation on background errors and recovers next tick', async t => {
  let calls = 0
  const closed = { ...thread, ticket: { ...thread.ticket, status: 'closed' } }
  const state = setup(t, async () => {
    calls++
    if (calls === 2) throw new Error('offline')
    return calls === 1 ? thread : closed
  })
  await flush()
  t.mock.timers.tick(5000)
  await flush()
  assert.equal(state.updates.length, 1)
  assert.equal(state.errors.filter(Boolean).length, 0)
  t.mock.timers.tick(5000)
  await flush()
  assert.equal(state.updates.at(-1).ticket.status, 'closed')
})

test('pauses during replies and ignores stale responses after resuming', async t => {
  let calls = 0, oldSignal, resolveOld
  const latest = { ...thread, messages: [{ id: 'new-message' }] }
  const state = setup(t, async signal => {
    calls++
    if (calls === 2) {
      oldSignal = signal
      return new Promise(resolve => { resolveOld = resolve })
    }
    return calls === 1 ? thread : latest
  })
  await flush()
  t.mock.timers.tick(5000)
  state.poller.pause()
  assert.equal(oldSignal.aborted, true)
  t.mock.timers.tick(10000)
  assert.equal(calls, 2)
  state.poller.resume()
  await flush()
  resolveOld(thread)
  await flush()
  assert.equal(state.updates.at(-1), latest)
  assert.equal(state.updates.length, 2)
})

test('an initial error can recover automatically', async t => {
  let calls = 0
  const state = setup(t, async () => {
    if (++calls === 1) throw new Error('offline')
    return thread
  })
  await flush()
  assert.equal(state.errors.filter(Boolean).length, 1)
  t.mock.timers.tick(5000)
  await flush()
  assert.equal(state.errors.at(-1), null)
  assert.equal(state.updates.at(-1), thread)
})
