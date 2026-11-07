import { useDeferredValue, useMemo, useState } from "react";
import { Badge, State, inputCls } from "../../components/ui";
import { AMENITIES, CONTACT, telHref } from "../../config/site";
import { useList } from "../../hooks/useList";
import { roomTypeConfig, roomTypeRowSchema } from "../room-type/config";
import { ROOM_STATUS, roomConfig, roomRowSchema } from "../room/config";
import RoomDetail from "./RoomDetail";

type Filters = { q: string; type_id: string; floor: string; status: string; max_price: string };
const NO_FILTERS: Filters = { q: "", type_id: "", floor: "", status: "", max_price: "" };

/** หน้าแรกสำหรับทุกคน (ยังไม่ต้อง login): ค้นหาห้อง ดูรายละเอียด แล้วเข้าสู่ระบบเพื่อจอง */
export default function HomePage({ onLogin }: { onLogin: () => void }) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [selected, setSelected] = useState<number | null>(null);

  // ค้นหาที่ backend (/rooms?q=&floor=...) — ใช้ค่าที่ deferred เพื่อไม่ยิง request ทุกตัวอักษรระหว่างพิมพ์
  const deferred = useDeferredValue(filters);
  const query = useMemo(() => {
    const params = new URLSearchParams(Object.entries(deferred).filter(([, v]) => v !== ""));
    const qs = params.toString();
    return qs ? `${roomConfig.endpoint}?${qs}` : roomConfig.endpoint;
  }, [deferred]);

  const rooms = useList(query, roomRowSchema);
  const allRooms = useList(roomConfig.endpoint, roomRowSchema); // ใช้ทำตัวเลือกชั้น
  const types = useList(roomTypeConfig.endpoint, roomTypeRowSchema);

  const floors = [...new Set(allRooms.data.map((r) => r.floor))].sort((a, b) => a - b);
  const typeOf = (id: number) => types.data.find((t) => t.room_type_id === id);
  const set = (key: keyof Filters, value: string) => setFilters((f) => ({ ...f, [key]: value }));
  const filtered = Object.values(filters).some((v) => v !== "");
  const availableCount = allRooms.data.filter((r) => r.status === "ว่าง").length;

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-medium ${
      active ? "border-accent bg-accent text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`;

  return (
    <div className="space-y-12">
      {/* แบนเนอร์ */}
      <section className="wood-grain relative overflow-hidden rounded-3xl p-8 text-white sm:p-12">
        <div aria-hidden className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
        <div aria-hidden className="absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-white/5" />
        <p className="text-sm font-medium tracking-wide text-amber-200">🏠 หอพักอบอุ่น สะอาด ปลอดภัย</p>
        <h2 className="mt-2 max-w-xl text-3xl font-bold leading-snug sm:text-4xl">
          บ้านหลังที่สองของคุณ<br />ที่ดูแลง่าย ครบในที่เดียว
        </h2>
        <p className="mt-3 max-w-lg text-white/80">
          ค้นหาห้องว่างและดูราคาได้ทันที สมัครสมาชิกเพื่อจองห้อง ดูใบแจ้งหนี้ และแจ้งซ่อมได้ตลอดเวลา
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#rooms" className="rounded-xl bg-amber-100 px-5 py-2.5 font-semibold text-ink hover:bg-white">
            ดูห้องว่าง {allRooms.data.length > 0 && `(${availableCount} ห้อง)`}
          </a>
          <button onClick={onLogin} className="rounded-xl border border-white/40 px-5 py-2.5 font-semibold hover:bg-white/10">
            สมัครสมาชิก / เข้าสู่ระบบ
          </button>
        </div>
      </section>

      {/* สิ่งอำนวยความสะดวก */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {AMENITIES.map((a) => (
          <div key={a.title} className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <div className="text-3xl">{a.icon}</div>
            <div className="mt-2 font-semibold">{a.title}</div>
            <div className="text-xs text-slate-500">{a.text}</div>
          </div>
        ))}
      </section>

      {/* ค้นหาและรายการห้อง */}
      <section id="rooms" className="scroll-mt-24">
        <h3 className="text-xl font-bold">ห้องพักของเรา</h3>
        <p className="mb-4 text-sm text-slate-500">ค้นหาตามเลขห้อง แบบห้อง ชั้น สถานะ หรือค่าเช่า แล้วกดที่ห้องเพื่อดูรายละเอียด</p>

        <div className="mb-3 flex flex-wrap gap-2">
          <button className={chip(filters.type_id === "")} onClick={() => set("type_id", "")}>ทุกแบบห้อง</button>
          {types.data.map((t) => (
            <button key={t.room_type_id} className={chip(filters.type_id === String(t.room_type_id))}
              onClick={() => set("type_id", String(t.room_type_id))}>
              ห้อง{t.type_name}
            </button>
          ))}
        </div>

        <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <label className="text-sm">
            <span className="mb-1 block font-medium">ค้นหา</span>
            <input className={inputCls} placeholder="เลขห้อง หรือชื่อแบบห้อง" value={filters.q}
              onChange={(e) => set("q", e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">ชั้น</span>
            <select className={inputCls} value={filters.floor} onChange={(e) => set("floor", e.target.value)}>
              <option value="">ทุกชั้น</option>
              {floors.map((f) => <option key={f} value={f}>ชั้น {f}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">สถานะ</span>
            <select className={inputCls} value={filters.status} onChange={(e) => set("status", e.target.value)}>
              <option value="">ทุกสถานะ</option>
              {ROOM_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">ค่าเช่าไม่เกิน (บาท)</span>
            <input className={inputCls} type="number" min={0} step={500} value={filters.max_price}
              onChange={(e) => set("max_price", e.target.value)} />
          </label>
          <div className="flex items-end">
            <button onClick={() => setFilters(NO_FILTERS)} disabled={!filtered}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-40">
              ล้างตัวกรอง
            </button>
          </div>
        </div>

        <p className="mb-3 text-sm text-slate-500" aria-live="polite">
          {!rooms.loading && !rooms.error && `พบ ${rooms.data.length} ห้อง`}
        </p>
        <State loading={rooms.loading} error={rooms.error} empty={!rooms.data.length} onRetry={rooms.reload} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.data.map((r) => {
            const t = typeOf(r.room_type_id);
            return (
              <button key={r.room_id} onClick={() => setSelected(r.room_id)}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/40">
                <div className="wood-grain flex items-end justify-between p-4 text-white">
                  <div>
                    <div className="text-3xl font-bold">{r.room_number}</div>
                    <div className="text-xs text-white/75">ชั้น {r.floor}</div>
                  </div>
                  <Badge value={r.status} />
                </div>
                <div className="p-4">
                  <div className="font-semibold">ห้อง{t?.type_name ?? "-"}</div>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-600">{t?.description ?? ""}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <div className="text-xl font-bold text-accent">
                      {Number(r.monthly_rate).toLocaleString("th-TH")}
                      <span className="ml-1 text-sm font-normal text-slate-500">บาท/เดือน</span>
                    </div>
                    <span className="text-sm font-medium text-accent">ดูรายละเอียด →</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ติดต่อผู้ดูแล */}
      <section id="contact" className="rounded-3xl border border-slate-200 bg-white p-6 text-center sm:p-10">
        <h3 className="text-xl font-bold">สนใจเข้าพัก? ติดต่อผู้ดูแลได้เลย</h3>
        <p className="mt-1 text-slate-600">{CONTACT.name} · {CONTACT.role}</p>
        <a href={telHref} className="mt-4 inline-block rounded-2xl bg-accent px-8 py-3 text-2xl font-bold text-white hover:brightness-110">
          📞 {CONTACT.phone}
        </a>
      </section>

      {selected !== null && (
        <RoomDetail roomId={selected} onClose={() => setSelected(null)}
          onBook={() => { setSelected(null); onLogin(); }} />
      )}
    </div>
  );
}
