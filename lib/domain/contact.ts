/** Deja solo dígitos de un teléfono (formato que espera WhatsApp). */
export function phoneDigits(phone: string) {
  return phone.replace(/\D/g, '')
}

/** Enlace wa.me con mensaje prellenado. Devuelve null si no hay número. */
export function whatsappLink(phone: string, text?: string, defaultCountryCode = '51') {
  let digits = phoneDigits(phone)
  if (!digits) return null
  // Números locales de 9 dígitos (Perú): se antepone el código de país.
  if (digits.length === 9) digits = `${defaultCountryCode}${digits}`
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/** true si el color hex es claro (para elegir texto oscuro encima). */
export function isLightColor(hex: string) {
  const value = hex.replace('#', '')
  if (value.length !== 6) return false
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16))
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}
