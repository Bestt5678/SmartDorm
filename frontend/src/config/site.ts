export const CONTACT = {
 phone: "000-000-0000", 
};

export const telHref = `tel:${CONTACT.phone.replace(/-/g, "")}`;

export const AMENITIES = [
  { icon: "📶", title: "Wi-Fi ความเร็วสูง", text: "ครอบคลุมทุกชั้น" },
  { icon: "🔒", title: "ปลอดภัย", text: "คีย์การ์ดและกล้องวงจรปิด" },
  { icon: "🅿️", title: "ที่จอดรถ", text: "จอดได้ทั้งรถยนต์และมอเตอร์ไซค์" },
  { icon: "🧺", title: "ซักรีด", text: "เครื่องซักผ้าหยอดเหรียญ" },
];
