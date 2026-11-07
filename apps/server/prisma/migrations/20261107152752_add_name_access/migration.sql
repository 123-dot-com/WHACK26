-- CreateTable
CREATE TABLE "GameAccess" (
    "gameId" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "GameAccess_pkey" PRIMARY KEY ("gameId")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameAccess_code_key" ON "GameAccess"("code");

-- AddForeignKey
ALTER TABLE "GameAccess" ADD CONSTRAINT "GameAccess_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
