export type HomeAction = {
  label: string;
  link: string;
  variant?: "primary" | "secondary";
};

export type HomeSection =
  | {
      id: string;
      layout: "banner";
      visible: boolean;
      eyebrow?: string;
      title: string;
      subtitle: string;
      image: string;
      actions: HomeAction[];
    }
  | {
      id: string;
      layout: "grid";
      visible: boolean;
      title: string;
      subtitle?: string;
      items: Array<{
        title: string;
        description: string;
        meta?: string;
        action?: HomeAction;
      }>;
    }
  | {
      id: string;
      layout: "slider";
      visible: boolean;
      title: string;
      subtitle?: string;
      items: Array<{
        title: string;
        description: string;
        image: string;
        action?: HomeAction;
      }>;
    }
  | {
      id: string;
      layout: "aboutus";
      visible: boolean;
      title: string;
      body: string;
      highlights: string[];
      action?: HomeAction;
    }
  | {
      id: string;
      layout: "testimonials";
      visible: boolean;
      title: string;
      items: Array<{
        quote: string;
        name: string;
        context: string;
      }>;
    }
  | {
      id: string;
      layout: "blogType1";
      visible: boolean;
      title: string;
      items: Array<{
        title: string;
        description: string;
        date: string;
      }>;
    }
  | {
      id: string;
      layout: "whatsapp";
      visible: boolean;
      label: string;
      link: string;
    };

export type HomeTemplate = {
  header: {
    title: string;
    logoText: string;
    navigation: HomeAction[];
    mobileNavigation: HomeAction[];
  };
  seo: {
    title: string;
    description: string;
  };
  sections: HomeSection[];
  footer: {
    visible: boolean;
    title: string;
    links: HomeAction[];
  };
};

export const homeTemplate: HomeTemplate = {
  header: {
    title: "Jaldee Consumer",
    logoText: "JC",
    navigation: [
      { label: "Services", link: "#services" },
      { label: "Bookings", link: "/bookings" },
      { label: "About", link: "#about" },
      { label: "Sign in", link: "/login" },
    ],
    mobileNavigation: [
      { label: "Home", link: "/" },
      { label: "Book", link: "/bookings" },
      { label: "Profile", link: "/profile" },
    ],
  },
  seo: {
    title: "Jaldee Consumer",
    description: "Static consumer home shell for service discovery, booking, and account journeys.",
  },
  sections: [
    {
      id: "home",
      layout: "banner",
      visible: true,
      eyebrow: "Consumer home",
      title: "Find services, book slots, and manage visits from one place.",
      subtitle: "A public-first consumer experience modeled after the earlier Website-MFE home templates, rendered locally without a REST call.",
      image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80",
      actions: [
        { label: "Book a service", link: "/bookings", variant: "primary" },
        { label: "Sign in", link: "/login", variant: "secondary" },
      ],
    },
    {
      id: "services",
      layout: "grid",
      visible: true,
      title: "Popular services",
      subtitle: "Static service tiles standing in for the old grid and dynamic item sections.",
      items: [
        {
          title: "Clinic appointment",
          description: "Choose a provider, department, date, and time.",
          meta: "Booking",
          action: { label: "View", link: "/bookings" },
        },
        {
          title: "Online consultation",
          description: "Start a remote visit with provider instructions.",
          meta: "Telehealth",
          action: { label: "View", link: "/bookings" },
        },
        {
          title: "Orders and invoices",
          description: "Review purchases, receipts, and payment status.",
          meta: "Account",
          action: { label: "Open", link: "/profile" },
        },
      ],
    },
    {
      id: "collections",
      layout: "slider",
      visible: true,
      title: "Featured journeys",
      subtitle: "Equivalent to the template slider sections, but static for the initial React shell.",
      items: [
        {
          title: "Book your next visit",
          description: "Pick the service and slot before entering account details.",
          image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80",
          action: { label: "Start", link: "/bookings" },
        },
        {
          title: "Track past activity",
          description: "Keep booking history and receipts in one consumer profile.",
          image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80",
          action: { label: "Profile", link: "/profile" },
        },
        {
          title: "Stay connected",
          description: "Surface provider updates and important instructions.",
          image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80",
        },
      ],
    },
    {
      id: "about",
      layout: "aboutus",
      visible: true,
      title: "Built for consumer-facing websites",
      body: "The old Angular home app loaded different templates and rendered sections from configuration. This shell keeps that idea: a public home page can render sections locally first, then later connect to CMS or consumer-service data.",
      highlights: ["Header and mobile navigation", "Banner, grid, slider, about, blog, and testimonial sections", "Quick access action", "Footer links and policy routes"],
      action: { label: "Read more", link: "#updates" },
    },
    {
      id: "reviews",
      layout: "testimonials",
      visible: true,
      title: "Consumer feedback",
      items: [
        {
          quote: "Booking took less than a minute and the visit details were easy to find.",
          name: "Anita",
          context: "Clinic customer",
        },
        {
          quote: "I could check appointment status without calling the front desk.",
          name: "Rahul",
          context: "Service customer",
        },
      ],
    },
    {
      id: "updates",
      layout: "blogType1",
      visible: true,
      title: "Latest updates",
      items: [
        {
          title: "How to prepare for an online visit",
          description: "Keep your documents, phone number, and payment method ready.",
          date: "Guide",
        },
        {
          title: "Managing family appointments",
          description: "A consumer profile can later support dependents and shared histories.",
          date: "Feature",
        },
      ],
    },
    {
      id: "quick-access",
      layout: "whatsapp",
      visible: true,
      label: "Chat",
      link: "https://wa.me/",
    },
  ],
  footer: {
    visible: true,
    title: "Jaldee Consumer",
    links: [
      { label: "Terms", link: "/terms" },
      { label: "Privacy", link: "/privacy" },
      { label: "Refund", link: "/refund" },
      { label: "Shipping", link: "/shipping" },
    ],
  },
};
