import { Inter, JetBrains_Mono } from "next/font/google";
import BillUnlockForm from "./BillUnlockForm";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export default function LandingPage() {
  return (
    <main
      className={`${inter.variable} ${mono.variable} flex min-h-screen items-center justify-center bg-[#EDE7D8] px-4 py-12 font-sans`}
    >
      <div className="w-full max-w-md">
        <div className="relative bg-[#FBF8F2] shadow-[0_1px_0_rgba(28,27,25,0.06)]">
          <div className="flex items-center justify-between border-b border-dashed border-[#C4BDAC] px-6 py-3 font-mono text-xs uppercase tracking-wide text-[#8C8577]">
            <span>Claim Ticket</span>
            <span>№ 0001</span>
          </div>

          <div className="px-6 pb-10 pt-8 sm:px-8">
            <h1 className="text-3xl font-semibold leading-tight text-[#1C1B19] sm:text-4xl">
              Bought our product from a store?
            </h1>
            <p className="mt-2 text-lg text-[#4A4438]">
              Upload your bill and unlock your free course — takes under two
              minutes.
            </p>

            <div className="mt-8">
              <BillUnlockForm />
            </div>
          </div>

          <div
            className="h-4 w-full bg-[#EDE7D8]"
            style={{
              clipPath:
                "polygon(0% 0%, 4% 100%, 8% 0%, 12% 100%, 16% 0%, 20% 100%, 24% 0%, 28% 100%, 32% 0%, 36% 100%, 40% 0%, 44% 100%, 48% 0%, 52% 100%, 56% 0%, 60% 100%, 64% 0%, 68% 100%, 72% 0%, 76% 100%, 80% 0%, 84% 100%, 88% 0%, 92% 100%, 96% 0%, 100% 100%, 100% 0%)",
            }}
          />
        </div>

        <p className="mt-4 text-center text-sm text-[#8C8577]">
          Step 1 of 4 — your details
        </p>
      </div>
    </main>
  );
}
