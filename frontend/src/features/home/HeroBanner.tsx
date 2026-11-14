export default function HeroBanner({
  totalRooms,
  availableCount,
  onLogin,
}: {
  totalRooms: number
  availableCount: number
  onLogin: () => void
}) {
  return (
    <section className="wood-grain relative overflow-hidden rounded-3xl p-8 text-white sm:p-12">
      <div aria-hidden className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
      <div aria-hidden className="absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-white/5" />
      <p className="text-sm font-medium tracking-wide text-amber-200">
        🏠 หอพักอบอุ่น สะอาด ปลอดภัย
      </p>
      <h2 className="mt-2 max-w-xl text-3xl font-bold leading-snug sm:text-4xl">
        บ้านหลังที่สองของคุณ
        <br />
        ที่ดูแลง่าย ครบในที่เดียว
      </h2>
      <p className="mt-3 max-w-lg text-white/80">
        ค้นหาห้องว่างและดูราคาได้ทันที สมัครสมาชิกเพื่อจองห้อง ดูใบแจ้งหนี้ และแจ้งซ่อมได้ตลอดเวลา
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href="#rooms"
          className="rounded-xl bg-amber-100 px-5 py-2.5 font-semibold text-ink hover:bg-white"
        >
          ดูห้องว่าง {totalRooms > 0 && `(${availableCount} ห้อง)`}
        </a>
        <button
          onClick={onLogin}
          className="rounded-xl border border-white/40 px-5 py-2.5 font-semibold hover:bg-white/10"
        >
          สมัครสมาชิก / เข้าสู่ระบบ
        </button>
      </div>
    </section>
  )
}
