import { useState } from 'react'

export default function RoomGallery({
  images,
  roomNumber,
  onClose,
}: {
  images: string[]
  roomNumber: string
  onClose: () => void
}) {
  const [photo, setPhoto] = useState(0)

  return (
    <>
      <div className="relative bg-slate-100">
        {images.length > 0 ? (
          <img
            src={images[photo]}
            alt={`ห้อง ${roomNumber}`}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div className="wood-grain grid aspect-[16/9] place-items-center text-5xl font-bold text-white">
            {roomNumber}
          </div>
        )}
        <button
          onClick={onClose}
          aria-label="ปิด"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-xl shadow"
        >
          ×
        </button>
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-5 pt-3">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setPhoto(i)}
              aria-label={`รูปที่ ${i + 1}`}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i === photo ? 'border-accent' : 'border-transparent'}`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </>
  )
}
