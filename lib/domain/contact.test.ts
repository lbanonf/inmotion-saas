import { describe, expect, it } from 'vitest'
import { isLightColor, whatsappLink } from './contact'

describe('whatsappLink', () => {
  it('normaliza números peruanos locales e internacionales', () => {
    expect(whatsappLink('970 639 275')).toBe('https://wa.me/51970639275')
    expect(whatsappLink('+51 970-639-275', 'Hola ✨')).toBe('https://wa.me/51970639275?text=Hola%20%E2%9C%A8')
    expect(whatsappLink('')).toBeNull()
  })
})

describe('isLightColor', () => {
  it('distingue fondos claros y oscuros', () => {
    expect(isLightColor('#f1ebe3')).toBe(true)
    expect(isLightColor('#242622')).toBe(false)
  })
})
