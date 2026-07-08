import { Link, useNavigate, useParams } from "react-router-dom";
import { homeTemplate } from "../data/homeTemplate";
import type { HomeAction, HomeSection } from "../data/homeTemplate";
import { accountPath } from "../utils/accountRoutes";

function navigateToAction(action: HomeAction, navigate: ReturnType<typeof useNavigate>, accountSlug?: string) {
  if (action.link.startsWith("#")) {
    document.querySelector(action.link)?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (/^https?:\/\//i.test(action.link)) {
    window.open(action.link, "_blank", "noopener,noreferrer");
    return;
  }

  navigate(accountPath(accountSlug, action.link));
}

function ActionButton({ action, tone = "light" }: { action: HomeAction; tone?: "light" | "dark" }) {
  const navigate = useNavigate();
  const { accountSlug } = useParams();
  const isPrimary = action.variant === "primary";

  return (
    <button
      type="button"
      onClick={() => navigateToAction(action, navigate, accountSlug)}
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition",
        isPrimary
          ? "bg-[#135c4c] text-white hover:bg-[#0f4f42]"
          : tone === "dark"
            ? "border border-white/25 text-white hover:bg-white/10"
            : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
      ].join(" ")}
    >
      {action.label}
    </button>
  );
}

function Header() {
  const { accountSlug } = useParams();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link to={accountPath(accountSlug)} className="flex items-center gap-3 text-slate-950">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-[#135c4c] text-sm font-bold text-white">
            {homeTemplate.header.logoText}
          </span>
          <span className="text-base font-semibold">{homeTemplate.header.title}</span>
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          {homeTemplate.header.navigation.map((item) => (
            item.link === "/login" ? (
              <Link
                key={item.label}
                to={accountPath(accountSlug, item.link)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.link} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                {item.label}
              </a>
            )
          ))}
        </nav>
      </div>
    </header>
  );
}

function BannerSection({ section }: { section: Extract<HomeSection, { layout: "banner" }> }) {
  return (
    <section id={section.id} className="border-b border-slate-200 bg-[#f5f7f2]">
      <div className="mx-auto grid min-h-[calc(100vh-74px)] max-w-7xl items-center gap-8 px-5 py-10 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="max-w-2xl">
          {section.eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#135c4c]">{section.eyebrow}</p> : null}
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-950 md:text-6xl">{section.title}</h1>
          <p className="mt-5 text-base leading-7 text-slate-700 md:text-lg">{section.subtitle}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            {section.actions.map((action) => (
              <ActionButton key={action.label} action={action} />
            ))}
          </div>
        </div>
        <div className="relative min-h-[320px] overflow-hidden rounded-md bg-slate-200 shadow-[0_24px_80px_rgba(15,23,42,0.16)] md:min-h-[520px]">
          <img src={section.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent p-5 text-white">
            <p className="max-w-md text-sm leading-6">Public home content renders immediately from local configuration.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function GridSection({ section }: { section: Extract<HomeSection, { layout: "grid" }> }) {
  return (
    <section id={section.id} className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-5">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold text-slate-950">{section.title}</h2>
          {section.subtitle ? <p className="mt-3 text-sm leading-6 text-slate-600">{section.subtitle}</p> : null}
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {section.items.map((item) => (
            <article key={item.title} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              {item.meta ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#135c4c]">{item.meta}</p> : null}
              <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              {item.action ? <div className="mt-5"><ActionButton action={item.action} /></div> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SliderSection({ section }: { section: Extract<HomeSection, { layout: "slider" }> }) {
  return (
    <section id={section.id} className="bg-[#edf4ef] py-14">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold text-slate-950">{section.title}</h2>
            {section.subtitle ? <p className="mt-3 text-sm leading-6 text-slate-600">{section.subtitle}</p> : null}
          </div>
        </div>
        <div className="mt-7 flex snap-x gap-4 overflow-x-auto pb-3">
          {section.items.map((item) => (
            <article key={item.title} className="min-w-[280px] snap-start overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm md:min-w-[360px]">
              <div className="aspect-[4/3] bg-slate-200">
                <img src={item.image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                {item.action ? <div className="mt-5"><ActionButton action={item.action} /></div> : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutSection({ section }: { section: Extract<HomeSection, { layout: "aboutus" }> }) {
  return (
    <section id={section.id} className="bg-white py-14">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[0.8fr_1.2fr]">
        <h2 className="text-3xl font-semibold leading-tight text-slate-950">{section.title}</h2>
        <div>
          <p className="text-base leading-7 text-slate-700">{section.body}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {section.highlights.map((highlight) => (
              <div key={highlight} className="rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
                {highlight}
              </div>
            ))}
          </div>
          {section.action ? <div className="mt-6"><ActionButton action={section.action} /></div> : null}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ section }: { section: Extract<HomeSection, { layout: "testimonials" }> }) {
  return (
    <section id={section.id} className="bg-[#17211d] py-14 text-white">
      <div className="mx-auto max-w-7xl px-5">
        <h2 className="text-3xl font-semibold">{section.title}</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {section.items.map((item) => (
            <figure key={item.name} className="rounded-md border border-white/10 bg-white/5 p-5">
              <blockquote className="text-base leading-7 text-slate-100">"{item.quote}"</blockquote>
              <figcaption className="mt-4 text-sm text-slate-300">{item.name} - {item.context}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function BlogSection({ section }: { section: Extract<HomeSection, { layout: "blogType1" }> }) {
  return (
    <section id={section.id} className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-5">
        <h2 className="text-3xl font-semibold text-slate-950">{section.title}</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {section.items.map((item) => (
            <article key={item.title} className="rounded-md border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#135c4c]">{item.date}</p>
              <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function renderSection(section: HomeSection) {
  if (!section.visible) return null;

  switch (section.layout) {
    case "banner":
      return <BannerSection key={section.id} section={section} />;
    case "grid":
      return <GridSection key={section.id} section={section} />;
    case "slider":
      return <SliderSection key={section.id} section={section} />;
    case "aboutus":
      return <AboutSection key={section.id} section={section} />;
    case "testimonials":
      return <TestimonialsSection key={section.id} section={section} />;
    case "blogType1":
      return <BlogSection key={section.id} section={section} />;
    case "whatsapp":
      return null;
  }
}

function Footer() {
  const { accountSlug } = useParams();

  if (!homeTemplate.footer.visible) return null;

  return (
    <footer className="bg-slate-950 px-5 pb-24 pt-10 text-white md:pb-10">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 md:flex-row md:items-center">
        <p className="text-lg font-semibold">{homeTemplate.footer.title}</p>
        <nav className="flex flex-wrap gap-3">
          {homeTemplate.footer.links.map((item) => (
            <Link key={item.label} to={accountPath(accountSlug, item.link)} className="text-sm text-slate-300 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

function MobileNav() {
  const { accountSlug } = useParams();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-slate-200 bg-white md:hidden">
      {homeTemplate.header.mobileNavigation.map((item) => (
        <Link key={item.label} to={accountPath(accountSlug, item.link)} className="px-3 py-3 text-center text-xs font-semibold text-slate-700">
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function QuickAccess() {
  const quick = homeTemplate.sections.find((section): section is Extract<HomeSection, { layout: "whatsapp" }> => section.layout === "whatsapp" && section.visible);
  if (!quick) return null;

  return (
    <a
      href={quick.link}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-20 right-5 z-40 rounded-full bg-[#135c4c] px-4 py-3 text-sm font-semibold text-white shadow-lg md:bottom-6"
    >
      {quick.label}
    </a>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />
      <main>
        {homeTemplate.sections.map(renderSection)}
      </main>
      <Footer />
      <QuickAccess />
      <MobileNav />
    </div>
  );
}
