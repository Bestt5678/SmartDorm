import { CONTACT, telHref } from '../../config/dormInfo'

export default function ContactSection() {
  return (
    <section
      id="contact"
      className="rounded-3xl border border-slate-200 bg-white p-6 text-center sm:p-10"
    >
      <h3 className="text-xl font-bold">สนใจเข้าพัก? ติดต่อผู้ดูแลได้เลย</h3>
      <a
        href={telHref}
        className="mt-4 inline-block rounded-2xl bg-accent px-8 py-3 text-2xl font-bold text-white hover:brightness-110"
      >
        📞 {CONTACT.phone}
      </a>
    </section>
  )
}
