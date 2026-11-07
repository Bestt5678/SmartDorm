-- บัญชีที่เข้าสู่ระบบผ่าน OAuth (Google/LINE/Facebook) อาจไม่มีอีเมลหรือรหัสผ่าน
ALTER TABLE "account" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- ผู้เช่าที่สมัครผ่าน OAuth ยังไม่มีเลขบัตรประชาชน (ต้องกรอกก่อนจองห้อง)
ALTER TABLE "tenant" ALTER COLUMN "id_card_no" DROP NOT NULL;

-- CreateTable
CREATE TABLE "oauth_identity" (
    "identity_id" SERIAL NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "account_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_identity_pkey" PRIMARY KEY ("identity_id"),
    CONSTRAINT "oauth_identity_provider_check" CHECK ("provider" IN ('google', 'line', 'facebook'))
);

-- CreateIndex
CREATE INDEX "oauth_identity_account_id_idx" ON "oauth_identity"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_oauth_provider_user" ON "oauth_identity"("provider", "provider_user_id");

-- AddForeignKey
ALTER TABLE "oauth_identity" ADD CONSTRAINT "oauth_identity_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("account_id") ON DELETE CASCADE ON UPDATE CASCADE;
