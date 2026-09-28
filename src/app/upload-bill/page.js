"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_IMAGE_DIMENSION = 1600;

function normalizeFieldValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

async function shrinkImageIfNeeded(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) {
    return file;
  }

  const image = await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to read image."));
    };
    img.src = url;
  });

  const { width, height } = image;
  const maxDimension = Math.max(width, height);
  if (maxDimension <= MAX_IMAGE_DIMENSION) {
    return file;
  }

  const scale = MAX_IMAGE_DIMENSION / maxDimension;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob((nextBlob) => resolve(nextBlob), "image/jpeg", 0.85),
  );

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export default function UploadBillPage() {
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [fields, setFields] = useState({
    productName: "",
    amount: "",
    mrp: "",
    discountPercent: "",
    invoiceNumber: "",
    date: "",
  });

  useEffect(() => {
    const raw = sessionStorage.getItem("billUnlockLead");
    if (raw) {
      setLead(JSON.parse(raw));
    }
  }, []);

  const updateField = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));

    if (file) {
      const billData = {
        fileName: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        ocrStatus: "complete",
        parsedBill: {
          ...fields,
          [key]: value,
        },
      };
      sessionStorage.setItem("billUpload", JSON.stringify(billData));
    }
  };

  const handleFileChange = async (event) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setStatus("");

    if (!selected) {
      sessionStorage.removeItem("billUpload");
      setFields({
        productName: "",
        amount: "",
        mrp: "",
        discountPercent: "",
        invoiceNumber: "",
        date: "",
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (!selected.type.startsWith("image/")) {
        throw new Error("Only image files are allowed for bill scanning.");
      }

      const uploadFile = await shrinkImageIfNeeded(selected);

      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await fetch("/api/scan-bill", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Could not scan this bill.");
      }

      const parsedBill = {
        productName: normalizeFieldValue(payload.productName),
        amount: normalizeFieldValue(payload.amount),
        mrp: normalizeFieldValue(payload.mrp),
        discountPercent: normalizeFieldValue(payload.discountPercent),
        invoiceNumber: normalizeFieldValue(payload.invoiceNumber),
        date: normalizeFieldValue(payload.date),
      };

      setFields(parsedBill);
      sessionStorage.setItem(
        "billUpload",
        JSON.stringify({
          fileName: uploadFile.name,
          type: uploadFile.type,
          size: uploadFile.size,
          uploadedAt: new Date().toISOString(),
          ocrStatus: "complete",
          parsedBill,
        }),
      );

      setStatus(
        "Bill scanned successfully. You can edit the fields before continuing.",
      );
    } catch (error) {
      console.error("Bill scan failed:", error);
      setStatus(
        "The bill could not be read reliably. Please upload a clearer photo or edit the extracted details manually.",
      );
      setFields({
        productName: "",
        amount: "",
        mrp: "",
        discountPercent: "",
        invoiceNumber: "",
        date: "",
      });
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

    const finalBill = {
      fileName: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      ocrStatus: "complete",
      parsedBill: { ...fields },
    };

    sessionStorage.setItem("billUpload", JSON.stringify(finalBill));
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
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? `Selected: ${file.name}` : "Choose bill image"}
          </label>

          <p className="mt-3 text-sm text-[#4A4438]">
            Upload a clear bill image to continue.
          </p>

          {isProcessing && (
            <div className="mt-4 flex items-center justify-center gap-3 rounded-md border border-[#C4BDAC] bg-[#F5F1E8] px-3 py-3 text-sm text-[#4A4438]">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1C1B19] border-t-transparent" />
              <span>Scanning bill...</span>
            </div>
          )}

          {status && !isProcessing && (
            <p className="mt-4 rounded-md border border-[#C4BDAC] bg-[#F5F1E8] px-3 py-2 text-left text-sm text-[#4A4438]">
              {status}
            </p>
          )}

          {file && !isProcessing && (
            <div className="mt-4 space-y-3 rounded-md border border-[#C4BDAC] bg-[#F5F1E8] px-3 py-3 text-left text-sm text-[#4A4438]">
              <label className="block">
                <span className="mb-1 block font-semibold">
                  Product description
                </span>
                <input
                  type="text"
                  value={fields.productName}
                  onChange={(event) =>
                    updateField("productName", event.target.value)
                  }
                  className="w-full rounded border border-[#C4BDAC] bg-[#FBF8F2] px-3 py-2 text-[#1C1B19] outline-none focus:border-[#1C1B19]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold">Amount</span>
                <input
                  type="text"
                  value={fields.amount}
                  onChange={(event) =>
                    updateField("amount", event.target.value)
                  }
                  className="w-full rounded border border-[#C4BDAC] bg-[#FBF8F2] px-3 py-2 text-[#1C1B19] outline-none focus:border-[#1C1B19]"
                />
              </label>
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
