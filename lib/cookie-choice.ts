export const COOKIE_CHOICE_KEY = 'clothes-shop-cookie-acceptance'
export const COOKIE_CHOICE_VERSION = 1
export const COOKIE_CHOICE_TTL = 180 * 24 * 60 * 60 * 1000

export function isCookieChoiceAccepted(raw: string | null, now = Date.now()): boolean {
  try {
    const record = JSON.parse(raw ?? 'null')
    return record?.version === COOKIE_CHOICE_VERSION && Number.isSafeInteger(record.acceptedAt)
      && record.acceptedAt <= now && now - record.acceptedAt < COOKIE_CHOICE_TTL
  } catch { return false }
}
