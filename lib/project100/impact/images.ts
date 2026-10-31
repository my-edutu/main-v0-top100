import sharp from "sharp";
export async function prepareImpactPhoto(bytes: Buffer): Promise<Buffer> {
  const image = sharp(bytes, { limitInputPixels: 24_000_000 });
  const metadata = await image.metadata();
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format))
    throw new Error("Unsupported photo format");
  return image
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
}
