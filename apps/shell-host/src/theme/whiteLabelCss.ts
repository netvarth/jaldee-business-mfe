const MAX_CUSTOM_CSS_LENGTH = 20_000;

const ALLOWED_SELECTORS = new Set([
  ":root",
  "html",
  "body",
  '[data-theme="light"]',
  '[data-theme="dark"]',
]);

const ALLOWED_PRODUCT_SELECTOR = /^\[data-product="(?:health|bookings|golderp|karty|finance|lending|hr|ai)"\]$/;

const ALLOWED_TOKEN = /^(?:--color-[a-z0-9-]+|--font-(?:family|weight)-[a-z0-9-]+|--form-label-[a-z0-9-]+|--line-height-[a-z0-9-]+|--radius-[a-z0-9-]+|--shadow-[a-z0-9-]+|--space-[a-z0-9-]+|--text-[a-z0-9-]+|--control-(?:height|padding-x|padding-y)|--transition-[a-z0-9-]+)$/;

const SAFE_VALUE = /^[a-zA-Z0-9#(),.%\s'"/_-]+$/;
const UNSAFE_CSS = /(?:@|url\s*\(|expression\s*\(|javascript\s*:|-moz-binding|behavior\s*:|<\/?style|\\)/i;

export interface WhiteLabelCssValidation {
  css: string;
  error: string | null;
}

/**
 * White-label CSS is intentionally limited to design-token declarations on
 * root, theme, and product scopes. This prevents arbitrary UI redressing and
 * network-capable CSS while preserving supported color/spacing/font overrides.
 */
export function validateWhiteLabelCss(input: string): WhiteLabelCssValidation {
  const source = input.trim();
  if (!source) return { css: "", error: null };
  if (source.length > MAX_CUSTOM_CSS_LENGTH) {
    return { css: "", error: `Custom CSS cannot exceed ${MAX_CUSTOM_CSS_LENGTH} characters.` };
  }
  if (UNSAFE_CSS.test(source)) {
    return { css: "", error: "Custom CSS cannot contain imports, URLs, escapes, executable CSS, or style tags." };
  }

  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  const blocks: string[] = [];
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(withoutComments)) !== null) {
    if (withoutComments.slice(lastIndex, match.index).trim()) {
      return { css: "", error: "Custom CSS contains malformed or nested rules." };
    }
    lastIndex = blockPattern.lastIndex;

    const selectors = match[1].split(",").map((selector) => selector.trim());
    if (
      selectors.length === 0 ||
      selectors.some((selector) => !ALLOWED_SELECTORS.has(selector) && !ALLOWED_PRODUCT_SELECTOR.test(selector))
    ) {
      return {
        css: "",
        error: "Custom CSS selectors are limited to :root, html, body, supported themes, and supported products.",
      };
    }

    const declarations = match[2]
      .split(";")
      .map((declaration) => declaration.trim())
      .filter(Boolean);
    if (declarations.length === 0) {
      return { css: "", error: "Each custom CSS rule must contain at least one design-token declaration." };
    }

    const safeDeclarations: string[] = [];
    for (const declaration of declarations) {
      const separator = declaration.indexOf(":");
      if (separator <= 0) {
        return { css: "", error: "Custom CSS contains an invalid declaration." };
      }
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const value = declaration.slice(separator + 1).trim();
      if (!ALLOWED_TOKEN.test(property)) {
        return { css: "", error: `Unsupported custom CSS property: ${property || "(empty)"}.` };
      }
      if (!value || value.length > 300 || !SAFE_VALUE.test(value) || UNSAFE_CSS.test(value)) {
        return { css: "", error: `Unsafe value supplied for ${property}.` };
      }
      safeDeclarations.push(`  ${property}: ${value};`);
    }

    blocks.push(`${selectors.join(", ")} {\n${safeDeclarations.join("\n")}\n}`);
  }

  if (lastIndex === 0 || withoutComments.slice(lastIndex).trim()) {
    return { css: "", error: "Custom CSS contains malformed or unsupported content." };
  }
  return { css: blocks.join("\n"), error: null };
}

export function sanitizeWhiteLabelCss(input: string): string {
  return validateWhiteLabelCss(input).css;
}
