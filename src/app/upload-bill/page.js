"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Tesseract from "tesseract.js";

function parseBillData(rawText) {
  const text = (rawText || "").replace(/\r/g, " ").replace(/\s+/g, " ").trim();
  const normalized = text.toLowerCase();

  const amountMatch =
    text.match(
      /(?:total(?:\s+amount)?|grand\s+total|amount\s+due|net\s+amount|balance\s+due|total due)\D{0,30}([₹$€£]?\s?\d[\d,]*\.?\d{0,2})/i,
    ) ||
    text.match(/(?:₹|rs\.?|inr)\s*([\d,]+\.?\d{0,2})/i) ||
    text.match(/([\d,]+\.?\d{0,2})\s*(?:rs\.?|inr|₹)/i);

  const dateMatch =
    text.match(
      /(?:bill\s*date|date|invoice\s*date)\D{0,20}(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    ) || text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);

  const invoiceMatch =
    text.match(
      /(?:invoice|bill|receipt|order|voucher)(?:\s*(?:no|#|number))?\D{0,15}([A-Za-z0-9\-/]+)/i,
    ) || text.match(/(?:inv|bill)\s*[:#-]?\s*([A-Za-z0-9\-/]+)/i);

  const merchantLine = text
    .split(/\n|\r/)
    .map((line) => line.trim())
    .find(
      (line) =>
        line &&
        !/^(invoice|bill|receipt|date|total|amount|tax|gst|hsn|cgst|sgst|qty|qty\s*|subtotal|balance|paid|due)$/i.test(
          line,
        ) &&
        line.length > 3,
    );

  return {
    rawText: text,
    amount: amountMatch ? amountMatch[1].replace(/[^\d.]/g, "") : null,
    invoiceNumber: invoiceMatch ? invoiceMatch[1].trim() : null,
    billDate: dateMatch ? dateMatch[1].trim() : null,
    merchant: merchantLine || null,
    textPreview: normalized.slice(0, 500),
  };
}

export default function UploadBillPage() {
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [file, setFile] = useState(null);
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

      const parsedBill = parseBillData(data.text);
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

          {file &&
            file.type !== "application/pdf" &&
            !isProcessing &&
            sessionStorage.getItem("billUpload") && (
              <div className="mt-4 rounded-md border border-[#C4BDAC] bg-[#F5F1E8] px-3 py-2 text-left text-sm text-[#4A4438]">
                <p>
                  <span className="font-semibold">Detected amount:</span>{" "}
                  {JSON.parse(sessionStorage.getItem("billUpload"))?.parsedBill
                    ?.amount || "Not detected"}
                </p>
                <p>
                  <span className="font-semibold">Invoice no:</span>{" "}
                  {JSON.parse(sessionStorage.getItem("billUpload"))?.parsedBill
                    ?.invoiceNumber || "Not detected"}
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
