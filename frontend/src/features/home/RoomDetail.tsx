import { useEffect, useState } from "react";
import { z } from "zod";
import { api, errorMessage } from "../../api/client";
import { Badge, Button } from "../../components/ui";
import { money } from "../../lib/format";

const RoomDetailSchema = z.object({
  room_id: z.coerce.number(),
  room_number: z.string(),
  floor: z.coerce.number(),
  monthly_rate: z.coerce.number(),
  status: z.string(),
  room_type: z.object({
    type_name: z.string(),
    description: z.string().nullish(),
    image_urls: z.array(z.string()).default([]),
    amenities: z.array(z.string()).default([]),
  }),
});
type RoomDetailData = z.infer<typeof RoomDetailSchema>;

/** รายละเอียดห้อง (รูป สิ่งอำนวยความสะดวก ราคา) แสดงเป็น modal บนหน้าแรก */
export default function RoomDetail({ roomId, onClose, onBook }: {
  roomId: number;
  onClose: () => void;
  onBook: () => void;
}) {
  const [room, setRoom] = useState<RoomDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/rooms/${roomId}`)
      .then((res) => {
        if (!cancelled) setRoom(RoomDetailSchema.parse(res.data));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const images = room?.room_type.image_urls ?? [];
  const available = room?.status === "ว่าง";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label="รายละเอียดห้อง"
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        {!room ? (
          <div className="p-8 text-center text-slate-500">
            {error ? <p className="text-red-700">{error}</p> : "กำลังโหลด…"}
            <button onClick={onClose} className="mt-4 block w-full text-sm underline">ปิด</button>
          </div>
        ) : (
          <>
            <div className="relative bg-slate-100">
              {images.length > 0 ? (
                <img src={images[photo]} alt={`ห้อง ${room.room_number}`}
                  className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="wood-grain grid aspect-[16/9] place-items-center text-5xl font-bold text-white">
                  {room.room_number}
                </div>
              )}
              <button onClick={onClose} aria-label="ปิด"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-xl shadow">
                ×
              </button>
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-5 pt-3">
                {images.map((src, i) => (
                  <button key={src} onClick={() => setPhoto(i)} aria-label={`รูปที่ ${i + 1}`}
                    className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i === photo ? "border-accent" : "border-transparent"}`}>
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">ห้อง {room.room_number}</h2>
                  <p className="text-slate-600">ห้อง{room.room_type.type_name} · ชั้น {room.floor}</p>
                </div>
                <Badge value={room.status} />
              </div>

              {room.room_type.description && <p className="text-slate-700">{room.room_type.description}</p>}

              {room.room_type.amenities.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-500">สิ่งอำนวยความสะดวก</h3>
                  <ul className="flex flex-wrap gap-2">
                    {room.room_type.amenities.map((a) => (
                      <li key={a} className="rounded-full bg-slate-100 px-3 py-1 text-sm">✓ {a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="text-2xl font-bold text-accent">
                  {money(room.monthly_rate)}
                  <span className="ml-1 text-sm font-normal text-slate-500">บาท/เดือน</span>
                </div>
                {available ? (
                  <Button onClick={onBook}>เข้าสู่ระบบเพื่อจองห้องนี้</Button>
                ) : (
                  <span className="text-sm text-slate-500">ห้องนี้ยังไม่ว่างในขณะนี้</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
