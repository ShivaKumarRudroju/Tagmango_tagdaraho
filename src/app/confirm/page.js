"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmPage() {
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [bill, setBill] = useState(null);

  useEffect(() => {
    const rawLead = sessionStorage.getItem("billUnlockLead");
    const rawBill = sessionStorage.getItem("billUpload");

    if (rawLead) setLead(JSON.parse(rawLead));
    if (rawBill) setBill(JSON.parse(rawBill));
  }, []);

  const handleSubmit = () => {
    const summary = {
      ...lead,
      bill: bill || { fileName: "No file selected" },
      submittedAt: new Date().toISOString(),
    };

    sessionStorage.setItem("billUnlockSummary", JSON.stringify(summary));
    router.push("/success");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#EDE7D8] px-4 py-12 font-sans text-[#1C1B19]">
      <div className="w-full max-w-2xl rounded-xl border border-[#C4BDAC] bg-[#FBF8F2] p-8 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#8C8577]">
          Step 3 of 4
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Confirm your details</h1>

        <div className="mt-6 space-y-4 rounded-lg border border-[#C4BDAC] bg-[#F5F1E8] p-5">
          {lead ? (
            <>
              <p>
                <span className="font-semibold">Name:</span> {lead.name}
              </p>
              <p>
                <span className="font-semibold">Phone:</span> {lead.phone}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {lead.email}
              </p>
            </>
          ) : (
            <p>No lead details found.</p>
          )}

          {bill ? (
            <>
              <p>
                <span className="font-semibold">Bill file:</span>{" "}
                {bill.fileName}
              </p>
              <p>
                <span className="font-semibold">OCR status:</span>{" "}
                {bill.ocrStatus || "Not scanned"}
              </p>
              {bill.parsedBill?.amount && (
                <p>
                  <span className="font-semibold">Amount detected:</span> ₹
                  {bill.parsedBill.amount}
                </p>
              )}
              {bill.parsedBill?.invoiceNumber && (
                <p>
                  <span className="font-semibold">Invoice no:</span>{" "}
                  {bill.parsedBill.invoiceNumber}
                </p>
              )}
              {bill.parsedBill?.billDate && (
                <p>
                  <span className="font-semibold">Bill date:</span>{" "}
                  {bill.parsedBill.billDate}
                </p>
              )}
            </>
          ) : (
            <p>
              <span className="font-semibold">Bill file:</span> Not uploaded
            </p>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border-2 border-[#1C1B19] bg-transparent py-3 font-mono text-sm uppercase tracking-wide text-[#1C1B19] transition-colors hover:bg-[#F0E6D3]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 border-2 border-[#1C1B19] bg-[#1C1B19] py-3 font-mono text-sm uppercase tracking-wide text-[#FBF8F2] transition-colors hover:bg-[#B23A2E] hover:border-[#B23A2E]"
          >
            Submit
          </button>
        </div>
      </div>
    </main>
  );
}
