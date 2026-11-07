// แก้ข้อมูลหอพักที่แสดงบนหน้าเว็บได้ที่ไฟล์นี้

export const CONTACT = {
  name: "คุณมาลี ดูแลดี",
  role: "ผู้ดูแลหอพัก",
  phone: "011-611-1111", // ← เปลี่ยนเป็นเบอร์จริงของผู้ดูแล
};

export const telHref = `tel:${CONTACT.phone.replace(/-/g, "")}`;

export const AMENITIES = [
  { icon: "📶", title: "Wi-Fi ความเร็วสูง", text: "ครอบคลุมทุกชั้น" },
  { icon: "🔒", title: "ปลอดภัย", text: "คีย์การ์ดและกล้องวงจรปิด" },
  { icon: "🅿️", title: "ที่จอดรถ", text: "จอดได้ทั้งรถยนต์และมอเตอร์ไซค์" },
  { icon: "🧺", title: "ซักรีด", text: "เครื่องซักผ้าหยอดเหรียญ" },
];
