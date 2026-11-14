import { useEffect, type ReactNode } from 'react'

export default function Modal({
  label,
  onClose,
  className = '',
  children,
}: {
  label: string
  onClose: () => void
  className?: string
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`w-full rounded-2xl bg-white shadow-xl ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
