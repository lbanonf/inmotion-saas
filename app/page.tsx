import { BookingLanding, type BookingConfig } from '@/components/booking-landing'

// White-label: cambia únicamente este objeto para reutilizar el flujo con otra marca.
const inMotionConfig: BookingConfig = {
  salon_id: 'in-motion-san-isidro',
  business: {
    name: 'In Motion',
    eyebrow: 'Color · Tratamientos · Styling',
    description: 'Una experiencia pensada para tu cabello, en un espacio donde cada detalle importa.',
    logo: 'IM',
    location: 'San Isidro, Perú',
    accent: '#8f6d5b',
    accentSoft: '#eee4dc',
  },
  services: [
    { id: 'color', name: 'Color & dimensión', description: 'Diagnóstico + aplicación personalizada', duration: '2h 30min', price: 'S/ 280' },
    { id: 'styling', name: 'Styling & acabado', description: 'Diseño, ondas o brushing', duration: '1h', price: 'S/ 120' },
    { id: 'treatment', name: 'Tratamiento capilar', description: 'Ritual nutritivo y reparador', duration: '1h 15min', price: 'S/ 160' },
  ],
  professionals: [
    { id: 'adriana', name: 'Adriana García', role: 'Colorista & fundadora', initials: 'AG' },
    { id: 'shela', name: 'Sheyla', role: 'Stylist senior', initials: 'SH' },
  ],
  availability: [
    { date: '2026-10-02', label: 'Vie', slots: ['10:00', '12:30', '15:00', '17:30'] },
    { date: '2026-10-03', label: 'Sáb', slots: ['09:00', '11:30', '14:00'] },
    { date: '2026-10-06', label: 'Mar', slots: ['10:00', '13:00', '16:30'] },
    { date: '2026-10-07', label: 'Mié', slots: ['09:30', '12:00', '15:30', '18:00'] },
  ],
}

export default function Page() {
  return <BookingLanding config={inMotionConfig} />
}
