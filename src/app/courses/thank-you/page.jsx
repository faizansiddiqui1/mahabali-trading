"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

const STORAGE_KEY = "courseThankyouData";
const communityLink =
  process.env.NEXT_PUBLIC_COURSE_WHATSAPP_COMMUNITY_URL ||
  process.env.NEXT_PUBLIC_COURSE_WHATSAPP_COMMUNITY_URL ||
  "https://chat.whatsapp.com/JeoQrKP4vBOAiIEOEl5cjT";

export default function CourseThankYouPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [copiedField, setCopiedField] = useState("");

  const copyToClipboard = async (value, field) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(""), 2000);
    } catch {
      setCopiedField("");
    }
  };

  const validateAccess = () => {
    if (typeof window === "undefined") return null;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    try {
      const parsed = JSON.parse(saved);
      if (
        !parsed?.name ||
        !parsed?.email ||
        !parsed?.phone ||
        !parsed?.timestamp
      ) {
        return null;
      }

      const createdAt = new Date(parsed.timestamp);
      const now = new Date();
      const isExpired = now - createdAt >= 60 * 60 * 1000;

      if (isExpired) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const userData = validateAccess();

    if (!userData) {
      router.push("/courses");
      return;
    }

    setTimeout(() => {
      setData(userData);
      setIsVisible(true);
    }, 0);

    const clearTimer = setTimeout(() => {
      localStorage.removeItem(STORAGE_KEY);
    }, 10000);

    return () => clearTimeout(clearTimer);
  }, [router]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111824] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#75c13f] border-solid"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111824] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="fixed top-0 left-1/4 w-64 h-64 bg-[#75c13f]/10 blur-[100px] rounded-full animate-pulse-slow"></div>
      <div className="fixed bottom-0 right-1/4 w-64 h-64 bg-[#5da432]/10 blur-[100px] rounded-full animate-pulse-slow delay-700"></div>

      <div
        className={`relative bg-[#0f1621] border border-white/10 rounded-[2rem] shadow-2xl p-6 sm:p-10 max-w-xl w-full overflow-hidden transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-[#75c13f]/30" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-[#75c13f]/20 to-[#5da432]/20 rounded-full mb-4 animate-bounce-slow">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
            PAYMENT{" "}
            <span className="bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-transparent">
              SUCCESSFUL!
            </span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Your seat for Price Behaviour Mastery is now confirmed.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10 hover:border-[#75c13f]/40 transition-colors">
            <h2 className="bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-transparent font-bold text-xs uppercase tracking-widest mb-4">
              Your Profile
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">
                  Full Name
                </p>
                <p className="text-sm font-semibold truncate">{data.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">
                  Email Address
                </p>
                <p className="text-sm font-semibold truncate">{data.email}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">
                  Contact No.
                </p>
                <p className="text-sm font-semibold">+91 {data.phone}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-5 border border-white/10 hover:border-[#5da432]/40 transition-colors">
            <h3 className="bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-transparent font-bold text-xs uppercase tracking-widest mb-4">
              Next Steps
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <span className="bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-transparent font-bold">
                  01.
                </span>
                <span className="text-gray-300">
                  Check your WhatsApp for course access updates.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-transparent font-bold">
                  02.
                </span>
                <span className="text-gray-300">
                  Check your email for course confirmation details.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-transparent font-bold">
                  03.
                </span>
                <span className="text-gray-300">
                  Save this contact number for live support and updates.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 bg-white/5 rounded-2xl p-5 border border-white/10 hover:border-[#75c13f]/40 transition-colors">
          <h3 className="bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-transparent font-bold text-xs uppercase tracking-widest mb-4">
            Payment Details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                Course
              </p>
              <p className="text-sm font-semibold">
                {data.courseName || "Price Behaviour Mastery"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                Amount
              </p>
              <p className="text-sm font-semibold">₹999</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                Payment ID
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm font-semibold truncate">
                  {data.paymentId || "-"}
                </p>
                <button
                  type="button"
                  onClick={() => copyToClipboard(data.paymentId, "payment")}
                  disabled={!data.paymentId}
                  aria-label={
                    copiedField === "payment"
                      ? "Copied payment id"
                      : "Copy payment id"
                  }
                  className="rounded-md border border-[#75c13f]/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#75c13f] transition-colors hover:bg-[#75c13f]/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copiedField === "payment" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                Order ID
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm font-semibold truncate">
                  {data.orderId || "-"}
                </p>
                <button
                  type="button"
                  onClick={() => copyToClipboard(data.orderId, "order")}
                  disabled={!data.orderId}
                  aria-label={
                    copiedField === "order"
                      ? "Copied order id"
                      : "Copy order id"
                  }
                  className="rounded-md border border-[#75c13f]/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#75c13f] transition-colors hover:bg-[#75c13f]/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copiedField === "order" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <a
            href={communityLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 mb-4 bg-gradient-to-r from-[#75c13f] to-[#5da432] text-gray-900 font-black uppercase tracking-tighter text-center block rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(117,193,63,0.3)] hover:shadow-[0_0_30px_rgba(117,193,63,0.5)] active:scale-95 hover:-translate-y-0.5"
          >
            Join WhatsApp Community
          </a>
          <Link
            href="/courses"
            className="w-full py-4 bg-gradient-to-r from-[#75c13f] to-[#5da432] text-gray-900 font-black uppercase tracking-tighter text-center block rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(117,193,63,0.3)] hover:shadow-[0_0_30px_rgba(117,193,63,0.5)] active:scale-95 hover:-translate-y-0.5"
          >
            Back to Course Page
          </Link>
          <p className="text-center text-[10px] text-gray-600 mt-4 uppercase font-bold tracking-widest">
            Mahhabali Education • India&apos;s No.1 Price Behavior Training
          </p>
        </div>

        <style jsx>{`
          @keyframes pulseSlow {
            0%,
            100% {
              opacity: 0.6;
            }
            50% {
              opacity: 1;
            }
          }
          @keyframes bounceSlow {
            0%,
            100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-6px);
            }
          }
          .animate-pulse-slow {
            animation: pulseSlow 5s ease-in-out infinite;
          }
          .animate-bounce-slow {
            animation: bounceSlow 2.4s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
