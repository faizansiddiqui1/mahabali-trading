import React from "react";

export const metadata = {
  title: "Terms of Service | Mahhabali Price Action",
  description: "Terms of Service of Mahhabali Price Action / Mahhabali Trades",
};

const Page = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Effective Date: <span className="font-medium">22 January 2026</span>
          </p>
          <p className="mt-1 text-sm sm:text-base text-gray-600 break-all">
            Website:{" "}
            <span className="font-medium">
              https://mahabalipriceaction.com/
            </span>
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl border bg-white p-5 sm:p-8">
          <TermsBlock title="1) Acceptance of Terms">
            <p>
              By accessing this website and purchasing/using our courses or
              services, you agree to be bound by these Terms of Service. If you
              do not agree, please do not use our website.
            </p>
          </TermsBlock>

          <TermsBlock title="2) Services Provided">
            <p>
              Mahhabali Price Action / Mahhabali Trades provides trading
              education and learning services including price action training,
              market structure education, training videos, PDFs,
              mentorship/community support (if available).
            </p>
          </TermsBlock>

          <TermsBlock title="3) Important Disclaimer (No Investment Advice)">
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="font-semibold text-gray-900">
                We are not SEBI registered investment advisors.
              </p>
              <p className="mt-2 text-sm sm:text-base text-gray-700">
                All content is for educational purposes only and should not be
                considered financial/investment advice. Trading involves risk
                and you may lose part or all of your capital. You are solely
                responsible for your trading and investment decisions.
              </p>
            </div>
          </TermsBlock>

          <TermsBlock title="4) Eligibility">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                You must be at least{" "}
                <span className="font-semibold">18 years old</span>.
              </li>
              <li>
                You must provide accurate information during registration and
                purchase.
              </li>
            </ul>
          </TermsBlock>

          <TermsBlock title="5) User Accounts & Course Access">
            <ul className="list-disc pl-5 space-y-2">
              <li>Course access is personal and non-transferable.</li>
              <li>You must not share your login details with anyone.</li>
              <li>
                Misuse, piracy, unauthorized sharing, or reselling may result in
                termination of access without refund.
              </li>
            </ul>
          </TermsBlock>

          <TermsBlock title="6) Payments">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Course fees will be displayed on the website; the final payable
                amount is shown at checkout.
              </li>
              <li>
                Example breakdown for the Price Behaviour Mastery course
                (subject to change): Course price ₹999, GST (18%) ₹179.82, Total
                ₹1,178.82.
              </li>
              <li>
                All prices are in Indian Rupees (INR). When interacting with
                payment gateways we use the smallest currency unit (paise). For
                example, ₹1,178.82 is sent as 117882 paise.
              </li>
              <li>
                Payments are processed by third-party gateways (currently
                Razorpay). By completing a purchase you authorize the processor
                to charge the displayed amount. We do not store card/UPI/bank
                details — only transaction references and minimal metadata for
                verification and support.
              </li>
              <li>
                Receipts and transaction IDs will be provided via email/WhatsApp
                when available. GST invoices will be issued as required by law.
              </li>
              <li>
                Access to purchased courses is granted after successful payment
                confirmation and server-side verification.
              </li>
            </ul>
          </TermsBlock>

          <TermsBlock title="7) Refund Policy">
            <p>
              Refund eligibility (if applicable) depends on the refund terms
              mentioned on the course page or refund policy page.
            </p>
            <p className="mt-2 text-sm sm:text-base text-gray-700">
              <span className="font-semibold">Note:</span> For digital products,
              once access is delivered, refunds are generally not possible.
            </p>
          </TermsBlock>

          <TermsBlock title="8) Intellectual Property Rights">
            <p>
              All website content and course materials including videos,
              lessons, PDFs, logos, branding, text, graphics, and designs are
              the intellectual property of Mahhabali Price Action / Mahhabali
              Trades.
            </p>
            <p className="mt-2">
              You may not copy, record, resell, redistribute, re-upload, or
              publish any content without written permission.
            </p>
          </TermsBlock>

          <TermsBlock title="9) Prohibited Activities">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Hacking, malware injection, or disrupting website/services.
              </li>
              <li>Fraudulent transactions or spamming.</li>
              <li>Unauthorized reselling or sharing of course content.</li>
              <li>Abusive behavior towards staff/community members.</li>
            </ul>
          </TermsBlock>

          <TermsBlock title="10) Limitation of Liability">
            <p>
              We are not responsible for any trading/investment losses,
              decisions taken based on course content, technical issues, website
              downtime, or third-party gateway errors.
            </p>
          </TermsBlock>

          <TermsBlock title="11) Termination">
            <p>
              We reserve the right to suspend or terminate access without notice
              if Terms are violated, suspicious activity is detected, or piracy
              is found.
            </p>
          </TermsBlock>

          <TermsBlock title="12) Governing Law">
            <p>
              These Terms are governed by the laws of{" "}
              <span className="font-semibold">India</span>. Any disputes shall
              be subject to Indian jurisdiction.
            </p>
          </TermsBlock>

          <TermsBlock title="13) Contact Us">
            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="text-sm sm:text-base">
                <span className="font-semibold">Phone:</span> +91 8756243093
              </p>
              <p className="text-sm sm:text-base break-all mt-1">
                <span className="font-semibold">Email:</span>{" "}
                support@mahabalipriceaction.com
              </p>
            </div>
          </TermsBlock>
        </div>
      </main>
    </div>
  );
};

export default Page;

/* ---------------- Helper Components ---------------- */

function TermsBlock({ title, children }) {
  return (
    <section className="py-6 border-b last:border-b-0">
      <h2 className="text-base sm:text-lg font-bold text-gray-900">{title}</h2>
      <div className="mt-3 text-sm sm:text-base text-gray-700 leading-relaxed">
        {children}
      </div>
    </section>
  );
}
