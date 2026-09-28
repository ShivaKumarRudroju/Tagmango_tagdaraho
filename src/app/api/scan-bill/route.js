import { NextResponse } from "next/server";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL_ID = "claude-3-5-sonnet-20241022";

function toBase64(buffer) {
  return Buffer.from(buffer).toString("base64");
}

function normalizeResponse(payload) {
  const fallback = {
    productName: "",
    amount: "",
    mrp: "",
    discountPercent: "",
    invoiceNumber: "",
    date: "",
  };

  if (!payload) return fallback;

  const normalized = {
    productName:
      payload.productName ||
      payload.product_name ||
      payload.description ||
      payload.itemName ||
      "",
    amount:
      payload.amount ??
      payload.salesValue ??
      payload.totalAmount ??
      payload.amountValue ??
      "",
    mrp: payload.mrp ?? payload.m_rp ?? payload.listPrice ?? "",
    discountPercent:
      payload.discountPercent ??
      payload.discount_percentage ??
      payload.discount ??
      "",
    invoiceNumber:
      payload.invoiceNumber ||
      payload.invoice_no ||
      payload.billNumber ||
      payload.invoiceNo ||
      "",
    date: payload.date || payload.invoiceDate || payload.billDate || "",
  };

  return {
    productName: String(normalized.productName || "").trim(),
    amount: String(normalized.amount || "").trim(),
    mrp: String(normalized.mrp || "").trim(),
    discountPercent: String(normalized.discountPercent || "").trim(),
    invoiceNumber: String(normalized.invoiceNumber || "").trim(),
    date: String(normalized.date || "").trim(),
  };
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No bill file was uploaded." },
        { status: 400 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const base64Data = toBase64(buffer);

    const supportedMediaType =
      mimeType.startsWith("image/") || mimeType === "application/pdf";

    if (!supportedMediaType) {
      return NextResponse.json(
        {
          error: "Unsupported file type. Please upload an image or PDF bill.",
        },
        { status: 400 },
      );
    }

    const contentPart =
      mimeType === "application/pdf"
        ? {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64Data,
            },
          }
        : {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64Data,
            },
          };

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: 500,
        system: `You are a careful invoice extraction assistant.
Read the bill and return valid JSON only.
Important rules:
- Extract the product name / description exactly from the item line.
- Extract the amount as the actual sales value / final bill amount for the product, not the MRP or list price.
- For this bill, if the MRP is 4199 and the sales value is 3779, use 3779.
- Return keys exactly: productName, amount, mrp, discountPercent, invoiceNumber, date.
- Use plain strings for values when needed, but keep numeric-looking values numeric where possible.
- If a field is not clearly visible, use an empty string.
- Do not include markdown fences or commentary.`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Read this bill and return the fields as JSON.",
              },
              contentPart,
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        {
          error: "Vision scan failed.",
          details: errText,
        },
        { status: response.status || 500 },
      );
    }

    const data = await response.json();
    const rawText = data?.content?.[0]?.text || "{}";
    const match = rawText.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : rawText;
    const parsed = JSON.parse(jsonText);

    return NextResponse.json(normalizeResponse(parsed));
  } catch (error) {
    console.error("Bill scan error:", error);
    return NextResponse.json(
      {
        error: "Could not scan the bill.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
