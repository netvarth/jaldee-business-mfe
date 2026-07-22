import { useEffect, type ReactNode } from "react";

const INTERACTIVE_SELECTOR = [
  "button",
  "input",
  "select",
  "textarea",
  "a[href]",
  "[contenteditable='true']",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='option']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='combobox']",
].join(",");

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function elementPath(element: Element, boundary: Element) {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== boundary) {
    const parent: Element | null = current.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter((child) => child.tagName === current?.tagName);
    parts.push(`${current.tagName.toLowerCase()}:${siblings.indexOf(current) + 1}`);
    current = parent;
  }
  return parts.reverse().join("/");
}

function semanticName(element: HTMLElement) {
  const labelledBy = element.getAttribute("aria-labelledby");
  const labelledText = labelledBy
    ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ")
    : "";
  const labelText = element.id
    ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(element.id)}"]`)?.textContent ?? ""
    : "";

  return slug([
    element.id,
    element.getAttribute("name"),
    element.getAttribute("aria-label"),
    labelledText,
    labelText,
    element.getAttribute("title"),
    element.getAttribute("placeholder"),
    element.getAttribute("role"),
    element.textContent,
    element.tagName,
  ].find((value) => value?.trim()) ?? "control");
}

function assignTestId(element: HTMLElement, boundary: HTMLElement) {
  if (element.hasAttribute("data-testid")) return;

  const scope = element.parentElement?.closest<HTMLElement>("[data-testid]");
  const scopeName = scope?.dataset.testid && scope !== element ? slug(scope.dataset.testid) : "hr";
  const semantic = semanticName(element) || "control";
  const pathHash = stableHash(elementPath(element, boundary));
  element.setAttribute("data-testid", `hr-auto-${scopeName}-${semantic}-${pathHash}`);
  element.setAttribute("data-automation-generated", "true");
}

export function AutomationTestIdBoundary({ children }: { children: ReactNode }) {
  useEffect(() => {
    const boundary = document.querySelector<HTMLElement>("[data-testid='hr-automation-boundary']");
    if (!boundary) return undefined;

    const scan = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(INTERACTIVE_SELECTOR)) assignTestId(root, boundary);
      root.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR).forEach((element) => assignTestId(element, boundary));
    };

    scan(boundary);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) scan(node);
      }));
    });
    observer.observe(boundary, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <div data-testid="hr-automation-boundary" className="contents">{children}</div>;
}
