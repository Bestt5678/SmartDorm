import { CONTACT, telHref } from '../../config/dormInfo'

export default function ContactBar() {
  return (
    <div className="bg-ink px-4 py-1.5 text-center text-xs text-white/85">
      ติดต่อ:{' '}
      <a href={telHref} className="font-semibold text-amber-200 underline">
        {CONTACT.phone}
      </a>
    </div>
  )
}
