"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Video,
  Award,
  Star,
  User,
  Mail,
  Phone,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatWebinarParts, getNextWebinarDate } from "../lib/webinar";

// Calculate webinar data outside component to prevent re-renders
const calculateWebinarData = () => {
  const webinarDateObj = getNextWebinarDate();
  const webinarType = "Live Trading Webinar";
  const { webinarDay, webinarDate, webinarTime } = formatWebinarParts(webinarDateObj);

  return {
    webinarDay,
    webinarDate,
    webinarTime,
    webinarType,
  };
};

// Set initial webinar data once
const initialWebinarData = calculateWebinarData();

export default function FormPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    webinarDay: initialWebinarData.webinarDay,
    webinarDate: initialWebinarData.webinarDate,
    webinarTime: initialWebinarData.webinarTime,
    webinarType: initialWebinarData.webinarType,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [remainingTime, setRemainingTime] = useState(30 * 60); // Initialize to 30 minutes

  const formRef = useRef(null);

  // Load saved timer state after component mounts (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTimer = localStorage.getItem("learningFormTimer");
      if (savedTimer) {
        const parsedTimer = parseInt(savedTimer, 10);
        // If timer is still valid (greater than 0), use it
        if (parsedTimer > 0 && parsedTimer !== remainingTime) {
          // Only update if different to avoid unnecessary renders
          setTimeout(() => {
            setRemainingTime(parsedTimer);
          }, 0);
        }
      }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        const newTime = prev - 1;
        // Save current timer state to localStorage (only in browser)
        if (typeof window !== "undefined") {
          localStorage.setItem("learningFormTimer", newTime.toString());
        }

        if (newTime <= 0) {
          // Timer reached 0, reset to 30 minutes
          const resetTime = 30 * 60;
          if (typeof window !== "undefined") {
            localStorage.setItem("learningFormTimer", resetTime.toString());
          }
          return resetTime;
        }
        return newTime;
      });
    }, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(timer);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error message when user starts typing
    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}h ${mins
      .toString()
      .padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
  };

  const scrollToForm = () => {
    if (formRef.current) {
      // Calculate offset for fixed bottom bar (approx 80-100px on mobile)
      const offset = 100;
      const elementPosition =
        formRef.current.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Force update formData with webinar data before submission
    const webinarData = calculateWebinarData();
    const updatedFormData = {
      ...formData,
      webinarDay: webinarData.webinarDay,
      webinarDate: webinarData.webinarDate,
      webinarTime: webinarData.webinarTime,
      webinarType: webinarData.webinarType,
    };

    setIsSubmitting(true);
    setSubmitSuccess(false);
    setErrorMessage("");

    try {
      // Prepare phone number without country code
      let formattedPhone = updatedFormData.phone.trim();
      if (formattedPhone.startsWith("91")) {
        formattedPhone = formattedPhone.substring(2);
      } else if (formattedPhone.startsWith("+91")) {
        formattedPhone = formattedPhone.substring(3);
      } else if (formattedPhone.startsWith("0")) {
        formattedPhone = formattedPhone.substring(1);
      }

      // Ensure we have a 10-digit number
      if (formattedPhone.length !== 10) {
        throw new Error("Invalid phone number. Must be 10 digits.");
      }

      // Create payload with all form data including webinar info
      const payload = {
        ...updatedFormData,
        phone: formattedPhone,
        confirmationMediaType:
          process.env.NEXT_PUBLIC_MART2META_CONFIRMATION_MEDIA_TYPE || "",
        confirmationMediaUrl:
          process.env.NEXT_PUBLIC_MART2META_CONFIRMATION_MEDIA_URL || "",
        reminderMediaType:
          process.env.NEXT_PUBLIC_MART2META_REMINDER_MEDIA_TYPE || "",
        reminderMediaUrl:
          process.env.NEXT_PUBLIC_MART2META_REMINDER_MEDIA_URL || "",
      };

      // Double-check webinar data is included
      if (!payload.webinarDay || !payload.webinarDate) {
        payload.webinarDay = webinarData.webinarDay;
        payload.webinarDate = webinarData.webinarDate;
        payload.webinarTime = webinarData.webinarTime;
        payload.webinarType = webinarData.webinarType;
      }

      // Call the API route
      const response = await fetch("/api/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        // Store form data in localStorage for thank-you page
        const thankYouData = {
          name: formData.name,
          email: formData.email,
          phone: formattedPhone,
          webinarDay: updatedFormData.webinarDay,
          webinarDate: updatedFormData.webinarDate,
          webinarTime: updatedFormData.webinarTime,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem("thankyouData", JSON.stringify(thankYouData));

        // Redirect to thank-you page
        router.push("/thank-you");

        // Optionally, you can still show success message locally too
        setSubmitSuccess(true);

        // Reset form after successful submission
        setFormData({
          name: "",
          email: "",
          phone: "",
          webinarDay: initialWebinarData.webinarDay,
          webinarDate: initialWebinarData.webinarDate,
          webinarTime: initialWebinarData.webinarTime,
          webinarType: initialWebinarData.webinarType,
        });

        // Show success message temporarily
        setTimeout(() => {
          setSubmitSuccess(false);
        }, 5000);
      } else {
        // Handle API error safely
        const errorMessage =
          result.message || result.error || "Submission failed";
        throw new Error(
          typeof errorMessage === "string"
            ? errorMessage
            : "Unknown error occurred",
        );
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setErrorMessage(
        error.message ||
          "An error occurred while submitting the form. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative min-h-screen bg-[#f8fafc] flex items-center justify-center overflow-hidden py-12 px-4" // Added pb-24 to prevent bottom bar overlap
    >
      {/* --- Background Design --- */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#00D9B8_0.5px,transparent_0.5px)] [background-size:24px_24px] opacity-[0.15]" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#00D9B8]/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white overflow-hidden">
        <div className="grid lg:grid-cols-2">
          {/* LEFT PANEL: Mentor Visuals (Desktop) */}
          <div className="relative hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-slate-50 to-white border-r border-slate-100">
            {/* Badges */}
            <div className="absolute top-10 left-10 animate-float">
              <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-3">
                <div className="bg-yellow-400 p-2 rounded-lg">
                  <Star className="w-5 h-5 text-white fill-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 leading-none">
                    4.8/5
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                    Top Rated Mentor
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-20 right-10 animate-float delay-700">
              <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-3">
                <div className="bg-gradient-to-r from-[#75c13f] to-[#5da432] p-2 rounded-lg text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 leading-none">
                    30K+
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                    Active Students
                  </p>
                </div>
              </div>
            </div>

            {/* Main Mentor Image Container */}
            <div className="relative group">
              <div className="absolute inset-0 bg-[#00D9B8]/20 rounded-full blur-3xl group-hover:bg-[#00D9B8]/30 transition-all duration-500" />
              <div className="relative w-72 h-96 xl:w-120 xl:h-[500px] bg-white rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl">
                <Image
                  fill
                  alt="Mentor Mahabali"
                  src="/tradingWeb.png"
                  className="object-cover object-top hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>

            <div className="mt-8 text-center">
              <h3 className="text-2xl font-black text-slate-800">
                Mr. Suresh Latiyal
              </h3>
              <p className="text-sm font-bold text-slate-800 bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-transparent uppercase tracking-[0.2em]">
                Price Action Expert
              </p>
            </div>
          </div>

          {/* RIGHT PANEL: Form Section */}
          <div className="p-8 sm:p-12 lg:p-16" ref={formRef}>
            <div className="max-w-md mx-auto">
              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-[1.15]">
                  Start Your{" "}
                  <span className="bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-transparent">
                    Trading
                  </span>{" "}
                  Journey Today
                </h2>
                <p className="mt-4 text-slate-500 font-medium">
                  Fill the form below to get a personalized roadmap from our
                  experts.
                </p>

                {/* Mobile Mentor Teaser (Hidden on Desktop) */}
                <div className="flex lg:hidden items-center gap-4 mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white border-2 border-[#75c13f]">
                    <Image
                      width={48}
                      height={48}
                      src="/tradingWeb.png"
                      alt="Suresh Latiyal"
                      className="object-cover"
                    />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800">
                      Mr. Suresh Latiyal
                    </p>
                    <div className="flex items-center gap-1 text-[10px] bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-transparent font-black uppercase tracking-widest">
                      <Users className="w-3 h-3 text-[#75c13f]" /> 30k+ Learners
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    {errorMessage}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 scroll-mt-24">
                {/* Name Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                    Full Name
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#75c13f] transition-colors" />
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#75c13f]/20 focus:border-[#75c13f] transition-all text-slate-800"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#75c13f] transition-colors" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="rahul@example.com"
                      className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#75c13f]/20 focus:border-[#75c13f] transition-all text-slate-800"
                    />
                  </div>
                </div>

                {/* Phone Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                    Phone Number
                  </label>
                  <div className="flex gap-3">
                    <div className="flex items-center justify-center w-16 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 font-bold text-sm">
                      +91
                    </div>
                    <div className="relative flex-1 group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#75c13f] transition-colors" />
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="98765 43210"
                        className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#75c13f]/20 focus:border-[#75c13f] transition-all text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full group mt-4 font-black cursor-pointer text-lg py-5 rounded-2xl transition-all duration-300 shadow-xl flex items-center justify-center gap-2 ${
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-slate-900 hover:bg-gradient-to-r from-[#75c13f] to-[#5da432] text-white hover:text-gray-900"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Send Enquiry
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-xs text-slate-400 font-medium">
                By submitting, you agree to our{" "}
                <a className="underline cursor-pointer" href="/terms-of-service">
                  Terms
                </a> &{" "}
                <a className="underline cursor-pointer" href="/privacy-policy">
                  Privacy Policy
                </a>
              </p>

              {/* Back to Home Button */}
              <div className="flex items-center justify-center mt-4">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-[#75c13f] font-bold hover:text-[#5da432] transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-15deg);
          }
          100% {
            transform: translateX(200%) skewX(-15deg);
          }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
