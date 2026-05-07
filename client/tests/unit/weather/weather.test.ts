import { describe, expect, it } from 'vitest'
import {
  classifyDust,
  codeToCondition,
  conditionEmoji,
} from '@/app/features/weather/utils/weather'

describe('codeToCondition', () => {
  it('maps WMO codes to coarse conditions', () => {
    expect(codeToCondition(0)).toBe('clear')
    expect(codeToCondition(1)).toBe('partly-cloudy')
    expect(codeToCondition(2)).toBe('partly-cloudy')
    expect(codeToCondition(3)).toBe('cloudy')
    expect(codeToCondition(45)).toBe('fog')
    expect(codeToCondition(48)).toBe('fog')
    expect(codeToCondition(55)).toBe('rain')
    expect(codeToCondition(75)).toBe('snow')
    expect(codeToCondition(82)).toBe('rain')
    expect(codeToCondition(95)).toBe('thunderstorm')
  })

  it('falls back to clear for unknown codes', () => {
    expect(codeToCondition(999)).toBe('clear')
  })
})

describe('conditionEmoji', () => {
  it('returns a non-empty string for every condition', () => {
    const conditions = ['clear', 'partly-cloudy', 'cloudy', 'fog', 'rain', 'snow', 'thunderstorm'] as const
    for (const c of conditions) {
      expect(conditionEmoji(c).length).toBeGreaterThan(0)
    }
  })
})

describe('classifyDust', () => {
  it('returns normal when both sources are null', () => {
    expect(classifyDust(null, null).level).toBe('normal')
  })

  it('prefers the dust field over PM10', () => {
    expect(classifyDust(20, 700).level).toBe('storm')
  })

  it('falls back to PM10 when dust is null', () => {
    expect(classifyDust(300, null).level).toBe('dusty')
  })

  it('classifies severity bands above the Riyadh baseline', () => {
    // Riyadh routinely sits ~100–200 μg/m³ on clear days, so 150 is still normal.
    expect(classifyDust(null, 150).level).toBe('normal')
    expect(classifyDust(null, 300).level).toBe('dusty')
    expect(classifyDust(null, 700).level).toBe('storm')
    expect(classifyDust(null, 1200).level).toBe('severe')
  })
})
