import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { INSURANCE_SYSTEM_PROMPT } from "@/lib/ai/insurance-prompt";

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.includes("your-") || key.includes("your_")) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  return new Anthropic({ apiKey: key });
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY = 10;

export async function POST(request: NextRequest) {
  try {
    const { messages } = (await request.json()) as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Mesajele sunt obligatorii" }, { status: 400 });
    }

    // Limit conversation history
    const trimmed = messages.slice(-MAX_HISTORY);

    const client = getClient();

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      system: INSURANCE_SYSTEM_PROMPT,
      messages: trimmed,
      max_tokens: 500,
      temperature: 0.3,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of response) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          console.error("[AI Chat] Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[AI Chat] Error:", err);
    const message =
      err instanceof Error && (err.message.includes("API_KEY") || err.message.includes("api_key") || err.message.includes("authentication"))
        ? "Chatbot-ul nu este configurat. Contactați administratorul."
        : "Eroare la procesarea mesajului. Încercați din nou.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
