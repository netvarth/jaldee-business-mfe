export interface CustomPageItem {
  name: string;
  displayName: string;
  icon: string;
  isCustom?: boolean;
}

export interface SectionContent {
  id: string;
  title: string;
  description: string;
  image: string;
  video?: string;
  titleFontWeight?: string;
  titleTextAlign?: string;
}

export interface SectionConfig {
  id: string;
  title: string;
  subTitle?: string;
  layout: string;
  aspectRatio?: string;
  className?: string;
  visible?: boolean;
  content: SectionContent[];
}

export interface Advertisement {
  id: string;
  title: string;
  enabled: boolean;
  mediaType: string;
  image: string;
  video?: string;
  link?: string;
  appearance?: string;
  delayMilliseconds?: number;
}

export interface SiteConfig {
  accountID?: number;
  template: string;
  primaryFont?: string;
  secondaryFont?: string;
  theme: string;
  logo: string;
  coverPicture?: string;
  header: {
    name: string;
    title: string;
    description: string;
    headerBgColor?: string;
    headerTextColor?: string;
    tickerBgColor?: string;
    tickerTextColor?: string;
  };
  footer?: {
    title: string;
    description: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
    canonicalUrl: string;
  };
  advertisements?: Advertisement[];
  customMenuKeys: CustomPageItem[];
  sections: SectionConfig[];
}

export interface FooterState {
  visible: boolean;
  variant: string;
  title: string;
  copyright: string;
  brandName: string;
  showDivider: boolean;
  addressLine1: string;
  addressLine2: string;
  description: string;
  logoAspectRatio: string;
  footerLogo: string;
  foregroundColor: string;
  backgroundColor: string;
}

export const SAMPLE_S3_URL =
  "https://jaldeeuiscale.s3.ap-south-1.amazonaws.com/154843/site_template.gz?t=Tue%20Aug%2004%202026%2013:51:44%20GMT+0530%20(India%20Standard%20Time)";

export const DEFAULT_SECTIONS: CustomPageItem[] = [
  { name: "site", displayName: "Website Template", icon: "🌐" },
  { name: "items", displayName: "Items", icon: "📦" },
  { name: "blogs", displayName: "Blogs", icon: "📰" },
  { name: "about", displayName: "About Us", icon: "ℹ️" },
  { name: "contact", displayName: "Contact", icon: "☎️" },
  { name: "news", displayName: "News", icon: "🗞️" },
  { name: "policy", displayName: "Policy", icon: "📜" },
];

export const RARE_CONCEPT_SAMPLE: SiteConfig = {
  accountID: 154843,
  template: "custom-template",
  primaryFont: "'Playfair Display', serif",
  secondaryFont: "custom",
  theme: "theme-rare",
  logo: "https://jaldeeui.s3.ap-south-1.amazonaws.com/130511/site_assets/rare%20new%20logo.webp",
  coverPicture:
    "https://jaldeeui.s3.ap-south-1.amazonaws.com/130511/site_assets/Poster%20-%20The%20Rare%20ConceptPremium%20Skincare%20%281587%20x%201587%20px%29.webp",
  seo: {
    title: "The Rare Concept",
    description:
      "Authentic skincare crafted with raw Camel Milk, Donkey Milk, and Yak Ghee. Ancestral wisdom meets modern purity for radiant skin.",
    keywords: "skincare, camel milk, donkey milk, yak ghee, natural beauty",
    canonicalUrl: "https://therareconcept.com",
  },
  advertisements: [
    {
      id: "cmwxuax",
      title: "Rare Skincare Special",
      enabled: true,
      mediaType: "image",
      image:
        "https://jaldeeui.s3.ap-south-1.amazonaws.com/130511/site_assets/Poster%20-%20The%20Rare%20ConceptPremium%20Skincare%20%281587%20x%201587%20px%29.webp",
      link: "login",
      appearance: "popup-center",
      delayMilliseconds: 3000,
    },
  ],
  header: {
    name: "fashion",
    title: "Experience the Essence of Nature with Us!",
    description: "Authentic skincare crafted with raw Camel Milk, Donkey Milk, and Yak Ghee.",
  },
  footer: {
    title: "The Rare Concept",
    description: "Ancestral wisdom meets modern purity for radiant skin.",
  },
  customMenuKeys: [],
  sections: [
    {
      id: "id-1na5ndvhu",
      layout: "banner",
      title: "The Rare Concept Hero Banner",
      subTitle: "Pure Ancestral Skincare",
      aspectRatio: "16:9",
      visible: true,
      content: [
        {
          id: "item-1",
          title: "Raw Camel & Donkey Milk Formulations",
          description: "Nourishing remedies sourced directly from sustainable farms.",
          image: "https://jaldeeui.s3.ap-south-1.amazonaws.com/130511/site_assets/rare%20new%20logo.webp",
        },
      ],
    },
    {
      id: "id-ku40ee8mv",
      layout: "grid",
      title: "OUR JOURNEY BEGINS WHERE NATURE IS AT ITS PUREST — ON THE FARM, NOT IN A CHEMICAL LAB.",
      subTitle: "Ethical & Chemical-Free Sourcing",
      aspectRatio: "1:1",
      visible: true,
      content: [
        {
          id: "item-2",
          title: "Camel Milk Radiance Serum",
          description: "Rich in Alpha-Hydroxy acids for deep rejuvenation.",
          image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600",
        },
        {
          id: "item-3",
          title: "Donkey Milk Restorative Cream",
          description: "Packed with vitamins A, B, and E to restore skin elasticity.",
          image: "https://images.unsplash.com/photo-1608248597263-0057e43a4524?w=600",
        },
      ],
    },
    {
      id: "id-5qt9wa29l",
      layout: "grid",
      title: "Real Results, Real Reviews",
      subTitle: "Loved by thousands of conscious skincare enthusiasts",
      aspectRatio: "1:1",
      visible: true,
      content: [
        {
          id: "item-4",
          title: "Transformative Glow",
          description: "My skin texture completely changed within 2 weeks of using Yak Ghee balm.",
          image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600",
        },
      ],
    },
    {
      id: "id-gi7ftvdyn",
      layout: "slider",
      title: "The Rare Concept Bestsellers",
      subTitle: "Explore our top rated natural formulations",
      aspectRatio: "4:3",
      visible: true,
      content: [
        {
          id: "item-5",
          title: "Golden Yak Ghee Cleanser",
          description: "Deep cleansing without stripping essential lipids.",
          image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600",
        },
      ],
    },
  ],
};

export const SECTION_LAYOUT_TYPES = [
  { value: "banner", label: "Hero Section / Banner" },
  { value: "bannerWithContent", label: "Banner Video/Image & Content" },
  { value: "slider", label: "Carousel / Slider" },
  { value: "grid", label: "Grid Layout" },
  { value: "withoutCards", label: "Card With Minimum Padding" },
  { value: "aboutus", label: "About Us Layout" },
  { value: "whatsapp", label: "Sticky Icon / Quick Contact" },
  { value: "testimonials", label: "Testimonials Template 1" },
  { value: "testimonialsType2", label: "Testimonials Template 2" },
  { value: "blogType1", label: "Blog Showcase" },
  { value: "imageWithContents", label: "Image with Contents" },
];

export const ASPECT_RATIO_PRESETS = [
  { value: "none", label: "None (Original Size)" },
  { value: "1:1", label: "1:1 Square (500x500)" },
  { value: "16:9", label: "16:9 Widescreen Hero (1920x1080)" },
  { value: "4:3", label: "4:3 Standard (1024x768)" },
  { value: "9:16", label: "9:16 Vertical Story (1080x1920)" },
  { value: "3:2", label: "3:2 DSLR Print (1800x1200)" },
  { value: "2:1", label: "2:1 Wide Cover (1600x800)" },
  { value: "4:5", label: "4:5 Portrait Mobile (1080x1350)" },
  { value: "21:9", label: "21:9 Ultra-Wide Cinema (2560x1080)" },
];
