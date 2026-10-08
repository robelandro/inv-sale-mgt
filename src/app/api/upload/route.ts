import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { saveFile } from "@/services/file.service";

// Maximum 400KB and image only as required
const MAX_SIZE = 400 * 1024; // 400 KB

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Allow upload during initial onboarding setup or when authenticated
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Image only check
    if (!file.type || !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Only image files (PNG, JPG, WebP, SVG, GIF) are allowed." },
        { status: 400 }
      );
    }

    // Max 400KB check
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 400 KB limit. Maximum allowed size is 400 KB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save binary data and metadata directly to PostgreSQL files table
    const record = await saveFile({
      name: file.name,
      mimeType: file.type,
      size: file.size,
      data: buffer,
    });

    return NextResponse.json({
      id: record.id,
      url: `/api/files/${record.id}`,
      name: record.name,
      size: record.size,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
