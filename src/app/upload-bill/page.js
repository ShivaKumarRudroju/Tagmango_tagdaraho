"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Tesseract from "tesseract.js";

const AMOUNT_REGEX = /\b\d{1,3}(?:,\d{3})*\.\d{2}\b/;

function parseBillData(rawText) {
  const text = (rawText || "").replace(/\r/g, " ").replace(/\s+/g, " ").trim();

  const lines = (rawText || "")
    .split(/\n|\r/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // 1. Locate the item table: header row -> first totals row
  const headerIdx = lines.findIndex(
    (l) => /description/i.test(l) && /(hsn|qty|amount)/i.test(l),
  );
  const endIdx =
    headerIdx === -1
      ? -1
      : lines.findIndex(
          (l, i) =>
            i > headerIdx &&
            /^(taxable|sub\s*total|total|discount|cgst|sgst|igst)/i.test(l),
        );

  let productName = null;
  let amount = null;
  let hsn = null;

  if (headerIdx !== -1 && endIdx > headerIdx + 1) {
    // Join all wrapped lines of the item row(s)
    let block = lines.slice(headerIdx + 1, endIdx).join(" ");

    // Amount: decimal number like 699.00 (first one in the row)
    const amountMatch = block.match(AMOUNT_REGEX);
    if (amountMatch) {
      amount = amountMatch[0].replace(/,/g, "");
      block = block.replace(amountMatch[0], " ");
    }

    // HSN/SAC: standalone 4-8 digit number
    const hsnMatch = block.match(/\b\d{4,8}\b/);
    if (hsnMatch) {
      hsn = hsnMatch[0];
      block = block.replace(hsnMatch[0], " ");
    }

    productName = block
      .replace(/^[\s|#]*\d{1,2}[\s.|)]+/, "") // leading row number "1"
      .replace(/[|]/g, " ") // stray table borders OCR picks up
      .replace(/\s+/g, " ")
      .trim();

    if (productName.length < 4) productName = null;
  }

  // 2. Fallback: keyword-based search if the table wasn't found
  if (!productName) {
    const line = lines.find((l) =>
      /(membership|workout|session|trial|fitness|gym|package|course|service)/i.test(
        l,
      ),
    );
    if (line) {
      const amountMatch = line.match(AMOUNT_REGEX);
      if (amountMatch && !amount) amount = amountMatch[0].replace(/,/g, "");

      productName = line
        .replace(/^\d{1,2}\s+/, "")
        .replace(/\b\d{4,8}\b/g, "")
        .replace(/\b\d{1,3}(?:,\d{3})*\.\d{2}\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  return {
    rawText: text,
    productName,
    amount,
    hsn,
    textPreview: text.toLowerCase().slice(0, 500),
  };
}

export default function UploadBillPage() {
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("billUnlockLead");
    if (raw) {
      setLead(JSON.parse(raw));
    }
  }, []);

  const handleFileChange = async (event) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setParsed(null);
    setOcrStatus("");

    if (!selected) {
      sessionStorage.removeItem("billUpload");
      return;
    }

    if (selected.type === "application/pdf") {
      setOcrStatus(
        "PDF upload is not OCR-ready in-browser. Please upload a JPG/PNG bill image for extraction.",
      );
      sessionStorage.setItem(
        "billUpload",
        JSON.stringify({
          fileName: selected.name,
          type: selected.type,
          size: selected.size,
          uploadedAt: new Date().toISOString(),
          ocrStatus: "pdf-upload-only",
        }),
      );
      return;
    }

    setIsProcessing(true);

    try {
      const { data } = await Tesseract.recognize(selected, "eng", {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setOcrStatus(
              `Scanning bill... ${Math.round(message.progress * 100)}%`,
            );
          }
        },
      });

      // Uncomment to debug how Tesseract splits the lines:
      // console.log("OCR TEXT:\n", data.text);

      const parsedBill = parseBillData(data.text);
      setParsed(parsedBill);

      const billData = {
        fileName: selected.name,
        type: selected.type,
        size: selected.size,
        uploadedAt: new Date().toISOString(),
        ocrStatus: "complete",
        ocrText: data.text,
        parsedBill,
      };

      sessionStorage.setItem("billUpload", JSON.stringify(billData));
      setOcrStatus("Bill scanned successfully.");
    } catch (error) {
      console.error("OCR failed:", error);
      setOcrStatus(
        "OCR could not read this bill. Please try another image or upload a clearer photo.",
      );
      sessionStorage.setItem(
        "billUpload",
        JSON.stringify({
          fileName: selected.name,
          type: selected.type,
          size: selected.size,
          uploadedAt: new Date().toISOString(),
          ocrStatus: "failed",
        }),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = () => {
    if (!file) return;
    router.push("/confirm");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#EDE7D8] px-4 py-12 font-sans text-[#1C1B19]">
      <div className="w-full max-w-xl rounded-xl border border-[#C4BDAC] bg-[#FBF8F2] p-8 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#8C8577]">
          Step 2 of 4
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Upload your bill</h1>

        {lead ? (
          <div className="mt-6 space-y-2 rounded-lg border border-dashed border-[#C4BDAC] bg-[#F5F1E8] p-4 text-sm text-[#4A4438]">
            <p>
              <span className="font-semibold">Name:</span> {lead.name}
            </p>
            <p>
              <span className="font-semibold">Phone:</span> {lead.phone}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {lead.email}
            </p>
          </div>
        ) : (
          <p className="mt-6 text-[#4A4438]">
            No lead details found in session storage.
          </p>
        )}

        <div className="mt-8 rounded-xl border-2 border-dashed border-[#C4BDAC] bg-[#F7F3EC] p-8 text-center">
          <label className="block cursor-pointer rounded-lg border border-[#1C1B19] bg-[#FBF8F2] px-4 py-3 text-sm font-medium text-[#1C1B19]">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? `Selected: ${file.name}` : "Choose bill file"}
          </label>

          <p className="mt-3 text-sm text-[#4A4438]">
            Upload a bill image or PDF to continue.
          </p>

          {ocrStatus && (
            <p className="mt-4 rounded-md border border-[#C4BDAC] bg-[#F5F1E8] px-3 py-2 text-left text-sm text-[#4A4438]">
              {ocrStatus}
            </p>
          )}

          {parsed && !isProcessing && (
            <div className="mt-4 rounded-md border border-[#C4BDAC] bg-[#F5F1E8] px-3 py-2 text-left text-sm text-[#4A4438]">
              <p>
                <span className="font-semibold">Product description:</span>{" "}
                {parsed.productName || "Not detected"}
              </p>
              <p className="mt-2">
                <span className="font-semibold">Amount:</span>{" "}
                {parsed.amount ? `₹${parsed.amount}` : "Not detected"}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!file || isProcessing}
          className="mt-8 w-full border-2 border-[#1C1B19] bg-[#1C1B19] py-3.5 font-mono text-sm uppercase tracking-wide text-[#FBF8F2] transition-colors hover:bg-[#B23A2E] hover:border-[#B23A2E] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? "Scanning bill…" : "Continue →"}
        </button>
      </div>
    </main>
  );
}
