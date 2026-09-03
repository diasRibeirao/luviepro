-- Allow password-reset tokens for both tenant users and platform administrators.
ALTER TABLE "PasswordResetToken" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "PasswordResetToken" ADD COLUMN "platformAdminId" TEXT;
CREATE INDEX "PasswordResetToken_platformAdminId_expiresAt_idx" ON "PasswordResetToken"("platformAdminId", "expiresAt");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_platformAdminId_fkey" FOREIGN KEY ("platformAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
