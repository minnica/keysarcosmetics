CREATE TABLE "PosMembershipRevisionProjection" (
  "id" UUID NOT NULL,
  "membershipId" UUID NOT NULL,
  "ticketEventId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "purchaseAmount" DECIMAL(14,2) NOT NULL,
  "customerNameSnapshot" VARCHAR(240) NOT NULL,
  "customerPhoneSnapshot" VARCHAR(32),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosMembershipRevisionProjection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosMembershipRevisionProjection_version_check" CHECK ("version" > 1 AND "purchaseAmount" >= 0)
);

CREATE UNIQUE INDEX "PosMembershipRevisionProjection_membershipId_version_key"
  ON "PosMembershipRevisionProjection"("membershipId", "version");
CREATE UNIQUE INDEX "PosMembershipRevisionProjection_ticketEventId_membershipId_key"
  ON "PosMembershipRevisionProjection"("ticketEventId", "membershipId");
CREATE INDEX "PosMembershipRevisionProjection_membershipId_creadoEn_idx"
  ON "PosMembershipRevisionProjection"("membershipId", "creadoEn");
CREATE INDEX "PosMembershipRevisionProjection_ticketEventId_idx"
  ON "PosMembershipRevisionProjection"("ticketEventId");

ALTER TABLE "PosMembershipRevisionProjection"
  ADD CONSTRAINT "PosMembershipRevisionProjection_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "PosClientMembership"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PosMembershipRevisionProjection"
  ADD CONSTRAINT "PosMembershipRevisionProjection_ticketEventId_fkey"
  FOREIGN KEY ("ticketEventId") REFERENCES "PosTicketEvent"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "PosMembershipRevisionProjection_append_only"
  BEFORE UPDATE OR DELETE ON "PosMembershipRevisionProjection"
  FOR EACH ROW EXECUTE FUNCTION "prevent_pos_membership_history_mutation"();
