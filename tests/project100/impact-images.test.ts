import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { prepareImpactPhoto } from "@/lib/project100/impact/images";
import { clearImpactReservation } from "@/lib/project100/impact/client-reservation";
describe("Project100 private photo and checkout lifecycle", () => {
  it("decodes and re-encodes an allowed photo, stripping metadata", async () => {
    const input = await sharp({
      create: { width: 20, height: 10, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    const output = await prepareImpactPhoto(input);
    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(20);
    expect(metadata.exif).toBeUndefined();
  });
  it("rejects SVG or corrupt bytes even when the upload claims to be a JPEG", async () => {
    await expect(
      prepareImpactPhoto(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" /></svg>',
        ),
      ),
    ).rejects.toThrow();
    await expect(
      prepareImpactPhoto(Buffer.from("not an image")),
    ).rejects.toThrow();
  });
  it("does not discard a newer pending checkout when an older payment return is revisited", () => {
    const values = new Map([
      [
        "project100-checkout:group",
        JSON.stringify({ key: "new-key", contributionId: "new-payment" }),
      ],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    clearImpactReservation(storage, "group", "old-payment");
    expect(values.has("project100-checkout:group")).toBe(true);
    clearImpactReservation(storage, "group", "new-payment");
    expect(values.has("project100-checkout:group")).toBe(false);
  });
});
