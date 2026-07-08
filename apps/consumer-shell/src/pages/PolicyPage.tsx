import { Link, useLocation, useParams } from "react-router-dom";
import { accountPath, isDomainScopedConsumerSite } from "../utils/accountRoutes";

const policyCopy: Record<string, { title: string; body: string }> = {
  terms: {
    title: "Terms and Conditions",
    body: "Static placeholder for consumer terms. Replace this with configured policy content when the consumer content service is ready.",
  },
  privacy: {
    title: "Privacy Policy",
    body: "Static placeholder for consumer privacy information. This route mirrors the policy-page behavior from the earlier home template.",
  },
  refund: {
    title: "Refund Policy",
    body: "Static placeholder for refund rules, cancellation windows, and payment reversal information.",
  },
  shipping: {
    title: "Shipping Policy",
    body: "Static placeholder for order delivery, pickup, and fulfillment details.",
  },
};

export default function PolicyPage() {
  const location = useLocation();
  const { accountSlug } = useParams();
  const segments = location.pathname.split("/").filter(Boolean);
  const page = isDomainScopedConsumerSite() ? segments[0] || "terms" : segments[1] || "terms";
  const content = policyCopy[page] ?? policyCopy.terms;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 px-5 py-4">
        <div className="mx-auto max-w-4xl">
          <Link to={accountPath(accountSlug)} className="text-sm font-semibold text-[#135c4c]">Back to home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="text-4xl font-semibold">{content.title}</h1>
        <p className="mt-5 text-base leading-7 text-slate-700">{content.body}</p>
      </main>
    </div>
  );
}
