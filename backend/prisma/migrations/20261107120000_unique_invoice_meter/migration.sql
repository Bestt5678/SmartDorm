-- Prevent issuing more than one invoice for the same utility meter.
CREATE UNIQUE INDEX "invoice_meter_id_key" ON "invoice"("meter_id");
