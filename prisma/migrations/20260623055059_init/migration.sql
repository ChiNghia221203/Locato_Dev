-- CreateTable
CREATE TABLE "file_assets" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "url" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "file_assets_key_key" ON "file_assets"("key");
