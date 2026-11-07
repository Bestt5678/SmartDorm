-- SmartDorm: payment verification, status checks, and index alignment.
-- Statements are written idempotently because earlier partial runs may have
-- committed individual DDL steps before failing.

-- Drop legacy FK names (recreated with Prisma names at the end)
ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "fk_account_staff";
ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "fk_account_tenant";
ALTER TABLE "booking" DROP CONSTRAINT IF EXISTS "fk_booking_room";
ALTER TABLE "booking" DROP CONSTRAINT IF EXISTS "fk_booking_tenant";
ALTER TABLE "contract" DROP CONSTRAINT IF EXISTS "fk_contract_booking";
ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "fk_invoice_contract";
ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "fk_invoice_meter";
ALTER TABLE "payment" DROP CONSTRAINT IF EXISTS "fk_payment_invoice";
ALTER TABLE "repair_request" DROP CONSTRAINT IF EXISTS "fk_repair_room";
ALTER TABLE "repair_request" DROP CONSTRAINT IF EXISTS "fk_repair_staff";
ALTER TABLE "room" DROP CONSTRAINT IF EXISTS "fk_room_type";
ALTER TABLE "utility_meter" DROP CONSTRAINT IF EXISTS "fk_meter_room";

-- Column defaults
ALTER TABLE "booking" ALTER COLUMN "booking_date" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "invoice" ALTER COLUMN "invoice_date" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "repair_request" ALTER COLUMN "request_date" SET DEFAULT CURRENT_TIMESTAMP;

-- Payment verification columns
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "note" VARCHAR(500);
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "slip_url" VARCHAR(255);
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'อนุมัติแล้ว';
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(6);
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "verified_by_account_id" INTEGER;
ALTER TABLE "payment" ALTER COLUMN "payment_date" SET DEFAULT CURRENT_TIMESTAMP;

-- Status CHECK constraints (Prisma does not manage these)
ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "chk_invoice_status";
ALTER TABLE "invoice" ADD CONSTRAINT "chk_invoice_status"
  CHECK (status IN ('ค้างชำระ', 'รอตรวจสอบ', 'ชำระบางส่วน', 'ชำระแล้ว', 'ยกเลิก'));

ALTER TABLE "payment" DROP CONSTRAINT IF EXISTS "chk_payment_status";
ALTER TABLE "payment" ADD CONSTRAINT "chk_payment_status"
  CHECK (status IN ('รอตรวจสอบ', 'อนุมัติแล้ว', 'ปฏิเสธ'));

-- Create new indexes
CREATE INDEX IF NOT EXISTS "invoice_invoice_date_idx" ON "invoice"("invoice_date");
CREATE INDEX IF NOT EXISTS "invoice_due_date_idx" ON "invoice"("due_date");
CREATE INDEX IF NOT EXISTS "payment_status_idx" ON "payment"("status");
CREATE INDEX IF NOT EXISTS "payment_payment_date_idx" ON "payment"("payment_date");
CREATE INDEX IF NOT EXISTS "repair_request_status_idx" ON "repair_request"("status");

CREATE INDEX IF NOT EXISTS "booking_room_id_status_idx" ON "booking"("room_id", "status");
CREATE INDEX IF NOT EXISTS "booking_tenant_id_idx" ON "booking"("tenant_id");
CREATE INDEX IF NOT EXISTS "invoice_contract_id_idx" ON "invoice"("contract_id");
CREATE INDEX IF NOT EXISTS "invoice_status_idx" ON "invoice"("status");
CREATE INDEX IF NOT EXISTS "payment_invoice_id_idx" ON "payment"("invoice_id");
CREATE INDEX IF NOT EXISTS "repair_request_room_id_idx" ON "repair_request"("room_id");
CREATE INDEX IF NOT EXISTS "repair_request_staff_id_idx" ON "repair_request"("staff_id");
CREATE INDEX IF NOT EXISTS "room_status_idx" ON "room"("status");
CREATE INDEX IF NOT EXISTS "room_room_type_id_idx" ON "room"("room_type_id");

-- Drop legacy index names after the replacements exist
DROP INDEX IF EXISTS "idx_booking_room_status";
DROP INDEX IF EXISTS "idx_booking_tenant";
DROP INDEX IF EXISTS "idx_invoice_contract";
DROP INDEX IF EXISTS "idx_invoice_status";
DROP INDEX IF EXISTS "idx_payment_invoice";
DROP INDEX IF EXISTS "idx_repair_room";
DROP INDEX IF EXISTS "idx_repair_staff";
DROP INDEX IF EXISTS "idx_room_status";
DROP INDEX IF EXISTS "idx_room_type";

-- Foreign keys (Prisma names)
ALTER TABLE "room" DROP CONSTRAINT IF EXISTS "room_room_type_id_fkey";
ALTER TABLE "room" ADD CONSTRAINT "room_room_type_id_fkey"
  FOREIGN KEY ("room_type_id") REFERENCES "room_type"("room_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking" DROP CONSTRAINT IF EXISTS "booking_room_id_fkey";
ALTER TABLE "booking" ADD CONSTRAINT "booking_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "room"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking" DROP CONSTRAINT IF EXISTS "booking_tenant_id_fkey";
ALTER TABLE "booking" ADD CONSTRAINT "booking_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contract" DROP CONSTRAINT IF EXISTS "contract_booking_id_fkey";
ALTER TABLE "contract" ADD CONSTRAINT "contract_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "utility_meter" DROP CONSTRAINT IF EXISTS "utility_meter_room_id_fkey";
ALTER TABLE "utility_meter" ADD CONSTRAINT "utility_meter_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "room"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "invoice_contract_id_fkey";
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_contract_id_fkey"
  FOREIGN KEY ("contract_id") REFERENCES "contract"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoice" DROP CONSTRAINT IF EXISTS "invoice_meter_id_fkey";
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_meter_id_fkey"
  FOREIGN KEY ("meter_id") REFERENCES "utility_meter"("meter_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment" DROP CONSTRAINT IF EXISTS "payment_invoice_id_fkey";
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "invoice"("invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment" DROP CONSTRAINT IF EXISTS "payment_verified_by_account_id_fkey";
ALTER TABLE "payment" ADD CONSTRAINT "payment_verified_by_account_id_fkey"
  FOREIGN KEY ("verified_by_account_id") REFERENCES "account"("account_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "repair_request" DROP CONSTRAINT IF EXISTS "repair_request_room_id_fkey";
ALTER TABLE "repair_request" ADD CONSTRAINT "repair_request_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "room"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "repair_request" DROP CONSTRAINT IF EXISTS "repair_request_staff_id_fkey";
ALTER TABLE "repair_request" ADD CONSTRAINT "repair_request_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "account_tenant_id_fkey";
ALTER TABLE "account" ADD CONSTRAINT "account_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("tenant_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "account_staff_id_fkey";
ALTER TABLE "account" ADD CONSTRAINT "account_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;
