export default function AuthHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string
  subtitle: string
  onClose: () => void
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิด"
        className="rounded-lg px-2 text-xl leading-none text-slate-400 hover:bg-slate-100"
      >
        ×
      </button>
    </div>
  )
}
