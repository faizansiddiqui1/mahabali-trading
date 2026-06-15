"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Award,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Star,
  User,
  Users,
} from "lucide-react";

const COURSE_PRICE = 999;
const MENTOR_VIDEO_URL = (
  process.env.NEXT_PUBLIC_MENTOR_VIDEO_URL || "/intro.mp4"
).trim();

const GST_RATE = Number(process.env.NEXT_PUBLIC_GST_RATE || 18);

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.getElementById("razorpay-checkout-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function PriceBreakdown({ price, gstRate }) {
  const gstAmount = Number((price * gstRate) / 100).toFixed(2);
  const total = Number(Number(price) + Number(gstAmount)).toFixed(2);
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

  return (
    <div className="rounded-lg border border-slate-100 bg-white/50 p-4 text-left">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Course price</span>
        <span className="font-medium text-slate-900">
          {formatter.format(price)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
        <span>GST ({gstRate}%)</span>
        <span className="font-medium text-slate-900">
          {formatter.format(Number(gstAmount))}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t pt-3 text-base">
        <span className="font-black text-slate-600">Total</span>
        <span className="font-black text-slate-900">
          {formatter.format(Number(total))}
        </span>
      </div>
    </div>
  );
}

export default function CourseFormPage() {
  const router = useRouter();
  const formRef = useRef(null);
  const paymentCompletedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadRazorpayScript().then((loaded) => mounted && setReady(loaded));
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (errorMessage) setErrorMessage("");
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim()
    ) {
      setErrorMessage("Please fill name, email, and phone.");
      return;
    }

    if (!agreed) {
      setErrorMessage("Please agree to the Terms & Privacy Policy.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Unable to create order.");
      }

      if (!ready || !window.Razorpay) {
        throw new Error(
          "Payment checkout is still loading. Please try again in a moment.",
        );
      }

      paymentCompletedRef.current = false;

      const options = {
        key: result.keyId,
        amount: result.order.amount,
        currency: result.order.currency,
        name: "Price Behaviour Mastery",
        description: "Price Behaviour Mastery",
        order_id: result.order.id,
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: { color: "#d9ff3f" },
        modal: {
          ondismiss: async () => {
            setLoading(false);
            if (paymentCompletedRef.current) return;
            try {
              await fetch("/api/razorpay/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...formData,
                  paymentStatus: "Cancel",
                }),
              });
            } catch {
              // Ignore tracking failure so checkout UX is unaffected.
            }
          },
        },
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...paymentResponse,
                ...formData,
              }),
            });
            const verifyResult = await verifyResponse.json();

            if (!verifyResult.success) {
              throw new Error(
                verifyResult.message || "Payment verification failed.",
              );
            }

            paymentCompletedRef.current = true;

            if (typeof window !== "undefined") {
              localStorage.setItem(
                "courseThankyouData",
                JSON.stringify({
                  name: formData.name.trim(),
                  email: formData.email.trim().toLowerCase(),
                  phone: formData.phone.trim(),
                  timestamp: new Date().toISOString(),
                  courseName: "Price Behaviour Mastery",
                  paymentId: paymentResponse.razorpay_payment_id,
                  orderId: paymentResponse.razorpay_order_id,
                  whatsappCommunityUrl:
                    verifyResult?.whatsappCommunityUrl || "",
                }),
              );
            }

            router.push("/courses/thank-you");
          } catch (paymentError) {
            setErrorMessage(
              paymentError?.message || "Payment verification failed.",
            );
            setLoading(false);
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (submitError) {
      setErrorMessage(submitError?.message || "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fafc] px-4 py-12">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(#00D9B8_0.5px,transparent_0.5px)] [background-size:24px_24px] opacity-[0.15]" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#00D9B8]/10 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl overflow-hidden rounded-[2.5rem] border border-white bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
        <div className="grid lg:grid-cols-2">
          <div className="relative hidden flex-col items-center justify-center border-r border-slate-100 bg-gradient-to-br from-slate-50 to-white p-12 lg:flex">
            <div className="absolute left-10 top-10 animate-float">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 p-3 backdrop-blur-md shadow-lg">
                <div className="rounded-lg bg-yellow-400 p-2">
                  <Star className="h-5 w-5 fill-white text-white" />
                </div>
                <div>
                  <p className="text-sm font-black leading-none text-slate-800">
                    4.8/5
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">
                    Top Rated Mentor
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-20 right-10 animate-float delay-700">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 p-3 backdrop-blur-md shadow-lg">
                <div className="rounded-lg bg-gradient-to-r from-[#75c13f] to-[#5da432] p-2 text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black leading-none text-slate-800">
                    30K+
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">
                    Active Students
                  </p>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 rounded-full bg-[#00D9B8]/20 blur-3xl transition-all duration-500 group-hover:bg-[#00D9B8]/30" />
              <div className="relative h-[500px] w-[420px] overflow-hidden rounded-[3rem] border-8 border-white bg-white shadow-2xl xl:w-[480px]">
                <Image
                  fill
                  alt="Mentor Mahabali"
                  src="/tradingWeb.png"
                  className="object-cover object-top transition-transform duration-700 hover:scale-105"
                />
              </div>
            </div>

            <div className="mt-8 text-center">
              <h3 className="text-2xl font-black text-slate-800">
                Mr. Suresh Latiyal
              </h3>
              <p className="bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-sm font-bold uppercase tracking-[0.2em] text-transparent">
                Price Action Expert
              </p>
            </div>
          </div>

          <div className="p-8 sm:p-12 lg:p-16" ref={formRef}>
            <div className="mx-auto max-w-md">
              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl font-black leading-[1.15] text-slate-900 sm:text-4xl">
                  Start Your{" "}
                  <span className="bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-transparent">
                    Trading
                  </span>{" "}
                  Journey Today
                </h2>
                <p className="mt-4 font-medium text-slate-500">
                  Fill the form below to continue to secure checkout.
                </p>

                <div className="mt-8 flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 lg:hidden">
                  <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-[#75c13f] bg-white">
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
                    <div className="flex items-center gap-1 bg-gradient-to-r from-[#75c13f] to-[#5da432] bg-clip-text text-[10px] font-black uppercase tracking-widest text-transparent">
                      <Users className="h-3 w-3 text-[#75c13f]" /> 30k+ Learners
                    </div>
                  </div>
                </div>

                {errorMessage ? (
                  <div className="mt-4 rounded-lg border border-red-400 bg-red-100 p-3 text-red-700">
                    {errorMessage}
                  </div>
                ) : null}
              </div>

              <div className="mb-6 rounded-[2rem] border border-[#75c13f]/20 bg-gradient-to-br from-[#75c13f]/10 to-transparent p-6 text-center shadow-sm">
                <div className="flex items-center justify-center gap-2">
                  <Award className="h-4 w-4 text-[#75c13f]" />
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#75c13f]">
                    Limited Seats
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-center gap-3">
                  <span className="text-xl font-semibold text-slate-400 line-through">
                    ₹2,4999
                  </span>
                  <span className="text-4xl font-black tracking-tighter text-slate-900">
                    ₹{COURSE_PRICE}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  One-time payment. Real market learning.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 scroll-mt-24">
                <Field
                  label="Full Name"
                  icon={User}
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />
                <Field
                  label="Email Address"
                  icon={Mail}
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  type="email"
                />
                <Field
                  label="Phone Number"
                  icon={Phone}
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  type="tel"
                />
                <div className="mb-4">
                  <PriceBreakdown price={COURSE_PRICE} gstRate={GST_RATE} />
                </div>

                <div className="flex items-center justify-center gap-3 text-sm text-slate-700">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      required
                      checked={agreed}
                      onChange={(e) => {
                        setAgreed(e.target.checked);
                      }}
                      className="h-4 w-4 mt-1 accent-[#75c13f]"
                    />
                    <span>
                      By submitting, you agree to our{" "}
                      <a
                        href="/terms-of-service"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#75c13f] underline"
                      >
                        Terms
                      </a>{" "}
                      &amp;{" "}
                      <a
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#75c13f] underline"
                      >
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full items-center justify-center gap-3 cursor-pointer overflow-hidden rounded-[10px] bg-slate-900 hover:bg-[#75c13f] py-4 text-lg font-black uppercase tracking-wider text-white hover:text-gray-900 transition-all duration-150 ease-in-out hover:-translate-y-[4px] hover:shadow-[0_20px_40px_-10px_rgba(117,193,63,0.5)] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]" />
                  <span className="relative z-10">Enroll Now</span>
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  )}
                </button>

                <p className="mt-2 text-center text-sm text-slate-500">
                  Note: कोर्स फीस ₹999 पर 18% GST लागू होगा.
                </p>
              </form>

              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                <ShieldCheck className="h-4 w-4 text-[#75c13f]" /> Secure
                Razorpay Checkout
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <div className="space-y-1.5">
      <label className="ml-1 text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <div className="group relative">
        <Icon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#75c13f]" />
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#75c13f] focus:bg-white focus:ring-4 focus:ring-[#75c13f]/10"
        />
      </div>
    </div>
  );
}
