"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SuccessPage() {
  const router = useRouter();
  const [productName, setProductName] = useState("your course");

  useEffect(() => {
    const rawBill = sessionStorage.getItem("billUpload");
    if (rawBill) {
      try {
        const bill = JSON.parse(rawBill);
        if (bill?.parsedBill?.productName) {
          setProductName(bill.parsedBill.productName);
        }
      } catch (error) {
        console.error("Failed to read product name from bill upload", error);
      }
    }
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#EDE7D8] px-4 py-12 font-sans text-[#1C1B19]">
      <div className="w-full max-w-lg rounded-xl border border-[#C4BDAC] bg-[#FBF8F2] p-8 text-center shadow-sm">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#8C8577]">
          Step 4 of 4
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Congratulations!</h1>
        <p className="mt-4 text-lg text-[#4A4438]">
          You&apos;ve unlocked your free Tagda Raho course for{" "}
          <strong>{productName}</strong>.
        </p>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-8 border-2 border-[#1C1B19] bg-[#1C1B19] px-6 py-3 font-mono text-sm uppercase tracking-wide text-[#FBF8F2] transition-colors hover:bg-[#B23A2E] hover:border-[#B23A2E]"
        >
          Back to home
        </button>
      </div>
    </main>
  );
}
