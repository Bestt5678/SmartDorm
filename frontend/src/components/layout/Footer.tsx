import { CONTACT, telHref } from '../../config/dormInfo'

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200 p-6 text-center text-sm text-slate-500">
      © SmartDorm · ติดต่อ{' '}
      <a href={telHref} className="font-medium text-accent">
        {CONTACT.phone}
      </a>
    </footer>
  )
}
