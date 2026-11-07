/** แสดงจำนวนเงินแบบไทย ทศนิยม 2 ตำแหน่ง เช่น 3,800.00 */
export const money = (v: unknown) =>
  Number(v ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
