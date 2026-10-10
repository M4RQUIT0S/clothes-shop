import assert from 'node:assert/strict'
import test from 'node:test'
import { COOKIE_CHOICE_TTL, isCookieChoiceAccepted } from '../lib/cookie-choice.ts'

const now = 1791650000000
test('la aceptación vigente se recuerda y vence a los 180 días', () => {
  const record = JSON.stringify({ version: 1, acceptedAt: now })
  assert.equal(isCookieChoiceAccepted(record, now), true)
  assert.equal(isCookieChoiceAccepted(record, now + COOKIE_CHOICE_TTL - 1), true)
  assert.equal(isCookieChoiceAccepted(record, now + COOKIE_CHOICE_TTL), false)
})
test('no se atribuye aceptación a datos ausentes, corruptos, futuros o de otra versión', () => {
  for (const raw of [null, 'broken', '{}', 'null', JSON.stringify({version:2,acceptedAt:now}), JSON.stringify({version:1,acceptedAt:now+1}), JSON.stringify({version:1,acceptedAt:'hoy'})]) {
    assert.equal(isCookieChoiceAccepted(raw, now), false)
  }
})
