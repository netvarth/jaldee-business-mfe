import DOMPurify from "dompurify";

const RICH_TEXT_TAGS = [
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "s",
  "u",
  "ul",
];

/**
 * Sanitizes persisted rich text before it crosses a React HTML rendering sink.
 * Images, inline styles, forms, media, SVG/MathML, scripts, data attributes,
 * and new-window targets are intentionally excluded.
 */
export function sanitizeRichText(value: unknown): string {
  const content = String(value ?? "").trim();
  if (!content) return "";

  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: RICH_TEXT_TAGS,
    ALLOWED_ATTR: ["href", "title"],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    FORBID_TAGS: ["form", "iframe", "math", "object", "script", "style", "svg", "template"],
    FORBID_ATTR: ["id", "style", "target"],
    RETURN_TRUSTED_TYPE: false,
  });
}

/**
 * Sanitizes content loaded into the editor while retaining its supported
 * tables, images, and inline formatting. DOMPurify still removes scripts,
 * event handlers, dangerous protocols, forms, embeds, SVG, and MathML.
 */
export function sanitizeEditableRichText(value: unknown): string {
  const content = String(value ?? "").trim();
  if (!content) return "";

  return DOMPurify.sanitize(content, {
    FORBID_TAGS: ["form", "iframe", "math", "object", "script", "svg", "template"],
    ALLOW_DATA_ATTR: false,
    RETURN_TRUSTED_TYPE: false,
  });
}
