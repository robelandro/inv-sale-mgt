import { NextRequest, NextResponse } from "next/server";
import { getFile } from "@/services/file.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    const fileRecord = await getFile(id);
    if (!fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = Buffer.isBuffer(fileRecord.data)
      ? fileRecord.data
      : Buffer.from(fileRecord.data as any);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": fileRecord.mimeType || "application/octet-stream",
        "Content-Length": String(fileRecord.size || buffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("Error serving file:", error);
    return NextResponse.json({ error: "Failed to retrieve file" }, { status: 500 });
  }
}
