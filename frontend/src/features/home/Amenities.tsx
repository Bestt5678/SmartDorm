import { AMENITIES } from '../../config/dormInfo'

export default function Amenities() {
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {AMENITIES.map((a) => (
        <div key={a.title} className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-3xl">{a.icon}</div>
          <div className="mt-2 font-semibold">{a.title}</div>
          <div className="text-xs text-slate-500">{a.text}</div>
        </div>
      ))}
    </section>
  )
}
