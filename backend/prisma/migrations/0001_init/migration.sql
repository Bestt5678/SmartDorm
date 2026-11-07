-- SmartDorm baseline schema derived from SmartDorm1.sql
-- Extended with account/auth, invoice types/deposit, room type media,
-- status constraints, and indexes used by the API.

CREATE TABLE room_type (
    room_type_id   SERIAL PRIMARY KEY,
    type_name      VARCHAR(50)  NOT NULL,
    base_price     NUMERIC(10,2) NOT NULL,
    description    TEXT,
    image_urls     TEXT[] NOT NULL DEFAULT '{}',
    amenities      TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE room (
    room_id        SERIAL PRIMARY KEY,
    room_number    VARCHAR(10)  NOT NULL UNIQUE,
    floor          INT          NOT NULL,
    room_type_id   INT          NOT NULL,
    monthly_rate   NUMERIC(10,2) NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'ว่าง',
    CONSTRAINT fk_room_type
        FOREIGN KEY (room_type_id) REFERENCES room_type(room_type_id),
    CONSTRAINT chk_room_status
        CHECK (status IN ('ว่าง', 'ไม่ว่าง', 'ปิดปรับปรุง'))
);

CREATE TABLE tenant (
    tenant_id      SERIAL PRIMARY KEY,
    full_name      VARCHAR(100) NOT NULL,
    id_card_no     VARCHAR(13)  NOT NULL UNIQUE,
    phone          VARCHAR(10),
    email          VARCHAR(100),
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE booking (
    booking_id     SERIAL PRIMARY KEY,
    room_id        INT          NOT NULL,
    tenant_id      INT          NOT NULL,
    booking_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
    move_in_date   DATE         NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'รอดำเนินการ',
    CONSTRAINT fk_booking_room
        FOREIGN KEY (room_id) REFERENCES room(room_id),
    CONSTRAINT fk_booking_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id),
    CONSTRAINT chk_booking_status
        CHECK (status IN ('รอดำเนินการ', 'ยืนยันแล้ว', 'ยกเลิก', 'เสร็จสิ้น'))
);

CREATE TABLE contract (
    contract_id    SERIAL PRIMARY KEY,
    booking_id     INT          NOT NULL UNIQUE,
    start_date     DATE         NOT NULL,
    end_date       DATE         NOT NULL,
    deposit        NUMERIC(10,2) NOT NULL,
    CONSTRAINT fk_contract_booking
        FOREIGN KEY (booking_id) REFERENCES booking(booking_id),
    CONSTRAINT chk_contract_dates
        CHECK (end_date > start_date)
);

CREATE TABLE staff (
    staff_id       SERIAL PRIMARY KEY,
    full_name      VARCHAR(100) NOT NULL,
    position       VARCHAR(50)  NOT NULL,
    phone          VARCHAR(10)
);

CREATE TABLE utility_meter (
    meter_id       SERIAL PRIMARY KEY,
    room_id        INT          NOT NULL,
    meter_month    DATE         NOT NULL,
    water_unit     NUMERIC(10,2) NOT NULL DEFAULT 0,
    electric_unit  NUMERIC(10,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_meter_room
        FOREIGN KEY (room_id) REFERENCES room(room_id),
    CONSTRAINT uq_meter_room_month
        UNIQUE (room_id, meter_month)
);

CREATE TABLE invoice (
    invoice_id      SERIAL PRIMARY KEY,
    contract_id     INT          NOT NULL,
    meter_id        INT,
    invoice_date    DATE         NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE         NOT NULL,
    rent_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
    water_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
    electric_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    deposit_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(10,2) GENERATED ALWAYS AS (rent_amount + water_amount + electric_amount + deposit_amount) STORED,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ค้างชำระ',
    invoice_type    VARCHAR(20)  NOT NULL DEFAULT 'RENT',
    CONSTRAINT fk_invoice_contract
        FOREIGN KEY (contract_id) REFERENCES contract(contract_id),
    CONSTRAINT fk_invoice_meter
        FOREIGN KEY (meter_id) REFERENCES utility_meter(meter_id),
    CONSTRAINT chk_invoice_status
        CHECK (status IN ('ค้างชำระ', 'ชำระบางส่วน', 'ชำระแล้ว', 'ยกเลิก')),
    CONSTRAINT chk_invoice_type
        CHECK (invoice_type IN ('RENT', 'DEPOSIT', 'UTILITY', 'OTHER'))
);

CREATE TABLE payment (
    payment_id     SERIAL PRIMARY KEY,
    invoice_id     INT          NOT NULL,
    payment_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
    amount         NUMERIC(10,2) NOT NULL,
    payment_type   VARCHAR(20)  NOT NULL,
    CONSTRAINT fk_payment_invoice
        FOREIGN KEY (invoice_id) REFERENCES invoice(invoice_id),
    CONSTRAINT chk_payment_amount
        CHECK (amount > 0)
);

CREATE TABLE repair_request (
    repair_id      SERIAL PRIMARY KEY,
    room_id        INT          NOT NULL,
    staff_id       INT,
    request_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
    description    TEXT         NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'รอดำเนินการ',
    CONSTRAINT fk_repair_room
        FOREIGN KEY (room_id) REFERENCES room(room_id),
    CONSTRAINT fk_repair_staff
        FOREIGN KEY (staff_id) REFERENCES staff(staff_id),
    CONSTRAINT chk_repair_status
        CHECK (status IN ('รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จสิ้น', 'ยกเลิก'))
);

CREATE TABLE account (
    account_id     SERIAL PRIMARY KEY,
    email          VARCHAR(100) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(20)  NOT NULL DEFAULT 'TENANT',
    tenant_id      INT UNIQUE,
    staff_id       INT UNIQUE,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_account_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE SET NULL,
    CONSTRAINT fk_account_staff
        FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE SET NULL,
    CONSTRAINT chk_account_role
        CHECK (role IN ('TENANT', 'STAFF', 'ADMIN'))
);

CREATE INDEX idx_room_type ON room(room_type_id);
CREATE INDEX idx_room_status ON room(status);
CREATE INDEX idx_booking_room_status ON booking(room_id, status);
CREATE INDEX idx_booking_tenant ON booking(tenant_id);
CREATE INDEX idx_invoice_contract ON invoice(contract_id);
CREATE INDEX idx_invoice_status ON invoice(status);
CREATE INDEX idx_payment_invoice ON payment(invoice_id);
CREATE INDEX idx_repair_room ON repair_request(room_id);
CREATE INDEX idx_repair_staff ON repair_request(staff_id);

CREATE UNIQUE INDEX uq_active_booking_per_room
    ON booking(room_id)
    WHERE status IN ('รอดำเนินการ', 'ยืนยันแล้ว');

COMMENT ON TABLE room_type IS 'ประเภทห้องพักและราคาเริ่มต้นของแต่ละประเภท';
COMMENT ON TABLE room IS 'ข้อมูลห้องพักแต่ละห้อง ชั้น ราคา และสถานะ';
COMMENT ON TABLE tenant IS 'ข้อมูลส่วนตัวของผู้เช่าหอพักแต่ละราย';
COMMENT ON TABLE booking IS 'การจองห้องพักล่วงหน้าก่อนทำสัญญาเช่า';
COMMENT ON TABLE contract IS 'สัญญาเช่าที่ทำขึ้นจากการจองที่ได้รับการยืนยัน';
COMMENT ON TABLE staff IS 'ผู้ดูแล พนักงาน และช่างซ่อมบำรุงของหอพัก';
COMMENT ON TABLE utility_meter IS 'ค่ามิเตอร์น้ำและไฟของแต่ละห้องในแต่ละรอบเดือน';
COMMENT ON TABLE invoice IS 'ใบแจ้งหนี้ค่าเช่า ค่าน้ำ และค่าไฟ ต่อรอบบิล';
COMMENT ON TABLE payment IS 'รายการชำระเงินของผู้เช่าตามใบแจ้งหนี้';
COMMENT ON TABLE repair_request IS 'คำร้องแจ้งซ่อมของแต่ละห้องพักและผู้รับผิดชอบ';
COMMENT ON TABLE account IS 'บัญชีเข้าใช้งานระบบสำหรับผู้เช่า พนักงาน และผู้ดูแล';
