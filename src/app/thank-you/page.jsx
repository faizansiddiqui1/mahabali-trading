"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const communityLink =
  process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ||
  process.env.WHATSAPP_COMMUNITY_URL;

export default function ThankYouPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  // Validate access and get data - pure function, no side effects
  const validateAccess = () => {
    if (typeof window === "undefined") return null;

    const saved = localStorage.getItem("thankyouData");
    if (!saved) return null;

    try {
      const parsedData = JSON.parse(saved);
      if (
        !parsedData.name ||
        !parsedData.email ||
        !parsedData.phone ||
        !parsedData.timestamp
      ) {
        return null;
      }

      const submissionTime = new Date(parsedData.timestamp);
      const currentTime = new Date();
      const timeDiff = currentTime - submissionTime;

      if (timeDiff >= 60 * 60 * 1000) {
        localStorage.removeItem("thankyouData");
        return null;
      }

      return parsedData;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    // Only run validation logic, don't set state directly
    const userData = validateAccess();

    if (!userData) {
      router.push("/");
      return;
    }

    // Set state outside the immediate effect execution
    setTimeout(() => {
      setData(userData);
      setIsVisible(true);
    }, 0);

    // Setup cleanup timer
    const timer = setTimeout(() => {
      localStorage.removeItem("thankyouData");
    }, 10000);

    // Cleanup function
    return () => {
      clearTimeout(timer);
    };
  }, [router]);

  // Show loading state while checking or if no data
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#A3E635] border-solid"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background Glows for modern look */}
      <div className="fixed top-0 left-1/4 w-64 h-64 bg-[#A3E635]/10 blur-[100px] rounded-full animate-pulse-slow"></div>
      <div className="fixed bottom-0 right-1/4 w-64 h-64 bg-[#A3E635]/10 blur-[100px] rounded-full animate-pulse-slow delay-700"></div>
      <div className="fixed top-1/3 right-[-80px] w-40 h-40 border border-[#75c13f]/20 rounded-full animate-orbit"></div>
      <div className="fixed bottom-16 left-[-60px] w-28 h-28 border border-[#5da432]/20 rounded-full animate-orbit delay-700"></div>

      <div
        className={`relative bg-[#1A1A1A] border border-white/10 backdrop-blur-md rounded-[2rem] shadow-2xl p-6 sm:p-10 max-w-xl w-full overflow-hidden transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-[#75c13f]/30" />
        <div className="pointer-events-none absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-[#75c13f]/20 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-56 h-56 bg-gradient-to-tr from-[#5da432]/20 to-transparent blur-3xl" />
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-[#75c13f]/20 to-[#5da432]/20 rounded-full mb-4 animate-bounce-slow">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
            REGISTRATION{" "}
            <span className="bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-transparent">
              SUCCESSFUL!
            </span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Welcome to the community of successful traders.
          </p>
        </div>

        <a
          href={communityLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 mb-4 bg-gradient-to-r from-[#75c13f] to-[#5da432] hover:from-[#75c13f] hover:to-[#5da432] text-gray-900 font-black uppercase tracking-tighter text-center block rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(117,193,63,0.3)] hover:shadow-[0_0_30px_rgba(117,193,63,0.5)] active:scale-95 hover:-translate-y-0.5"
        >
          Join WhatsApp Community
        </a>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Details Section */}
          <div className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:border-[#75c13f]/40 transition-colors">
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
          {(data.webinarDate || data.webinarDay || data.webinarTime) && (
            <div className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:border-[#75c13f]/40 transition-colors">
              <h2 className="bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-transparent font-bold text-xs uppercase tracking-widest mb-4">
                Webinar Schedule
              </h2>
              <div className="space-y-4 ">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">
                    Date
                  </p>
                  <p className="text-sm font-semibold">
                    {data.webinarDate || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">
                    Day
                  </p>
                  <p className="text-sm font-semibold">
                    {data.webinarDay || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">
                    Time
                  </p>
                  <p className="text-sm font-semibold">
                    {data.webinarTime || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-8">
          <p className="text-center text-[10px] text-gray-600 mt-4 uppercase font-bold tracking-widest">
            Mahhabali Education • India&apos;s No.1 Price Behavior Training
          </p>
        </div>
        <style jsx>{`
          @keyframes orbit {
            0% {
              transform: translateY(0) rotate(0deg);
            }
            50% {
              transform: translateY(-12px) rotate(8deg);
            }
            100% {
              transform: translateY(0) rotate(0deg);
            }
          }
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
          .animate-orbit {
            animation: orbit 6s ease-in-out infinite;
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
