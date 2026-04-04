import { NextResponse } from "next/server";
import { enhanceImage } from "@/lib/minimax";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageBase64, persona, prompt } = body;

    if (!imageBase64 || !persona || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: imageBase64, persona, prompt" },
        { status: 400 }
      );
    }

    const result = await enhanceImage(imageBase64, prompt, persona);

    return NextResponse.json({ enhancedImageUrl: result.original, styledImageUrl: result.styled });
  } catch (error) {
    console.error("Error enhancing image:", error);
    return NextResponse.json(
      {
        error: "Failed to enhance image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
