import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { cn } from "../../utils";

export interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  id?: string;
  placeholder?: string;
  fullWidth?: boolean;
  minHeightClassName?: string;
  disabled?: boolean;
  testId?: string;
  allowImageUpload?: boolean;
}

type MenuKey = "align" | "list" | "insert" | "textColor" | "highlightColor" | null;
type ResponsiveViewport = "full" | "desktop" | "tablet" | "mobile";
type ImagePlacement = "left" | "center" | "right";
type AlignmentCommand = "justifyLeft" | "justifyCenter" | "justifyRight" | "justifyFull";
type ActiveMarks = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  unorderedList: boolean;
  orderedList: boolean;
};

type ToolbarAction = {
  label: ReactNode;
  command: string;
  title: string;
};

const BLOCK_OPTIONS = [
  { label: "Normal text", value: "P" },
  { label: "Heading 1", value: "H1" },
  { label: "Heading 2", value: "H2" },
  { label: "Heading 3", value: "H3" },
  { label: "Quote", value: "BLOCKQUOTE" },
  { label: "Code block", value: "PRE" },
];

const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times", value: '"Times New Roman", serif' },
  { label: "Courier", value: '"Courier New", monospace' },
];

const FONT_SIZES = [
  { label: "11", value: "11px" },
  { label: "12", value: "12px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "24", value: "24px" },
  { label: "32", value: "32px" },
];

const LINE_HEIGHTS = [
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "1.8", value: "1.8" },
  { label: "2.0", value: "2" },
];

const RESPONSIVE_VIEWPORTS: Array<{ label: string; value: ResponsiveViewport; maxWidth: string }> = [
  { label: "Full", value: "full", maxWidth: "100%" },
  { label: "Desktop", value: "desktop", maxWidth: "920px" },
  { label: "Tablet", value: "tablet", maxWidth: "768px" },
  { label: "Mobile", value: "mobile", maxWidth: "390px" },
];

const IMAGE_WIDTH_OPTIONS = ["25%", "50%", "75%", "100%"];
const IMAGE_PLACEMENTS: Array<{ label: string; value: ImagePlacement }> = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
];

const ALIGNMENT_ACTIONS: Array<ToolbarAction & { command: AlignmentCommand; icon: ReactNode; text: string }> = [
  { icon: <AlignLeftIcon />, text: "Left", label: <MenuLabel icon={<AlignLeftIcon />} text="Left" />, command: "justifyLeft", title: "Align left" },
  { icon: <AlignCenterIcon />, text: "Center", label: <MenuLabel icon={<AlignCenterIcon />} text="Center" />, command: "justifyCenter", title: "Align center" },
  { icon: <AlignRightIcon />, text: "Right", label: <MenuLabel icon={<AlignRightIcon />} text="Right" />, command: "justifyRight", title: "Align right" },
  { icon: <AlignJustifyIcon />, text: "Justify", label: <MenuLabel icon={<AlignJustifyIcon />} text="Justify" />, command: "justifyFull", title: "Justify" },
];

const LIST_ACTIONS: ToolbarAction[] = [
  { label: <MenuLabel icon={<BulletedListIcon />} text="Bulleted list" />, command: "insertUnorderedList", title: "Bulleted list" },
  { label: <MenuLabel icon={<NumberedListIcon />} text="Numbered list" />, command: "insertOrderedList", title: "Numbered list" },
  { label: <MenuLabel icon={<OutdentIcon />} text="Decrease indent" />, command: "outdent", title: "Decrease indent" },
  { label: <MenuLabel icon={<IndentIcon />} text="Increase indent" />, command: "indent", title: "Increase indent" },
];

function normalizeHtml(value: string) {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "<br>" || trimmed === "<div><br></div>" || trimmed === "<p><br></p>") {
    return "";
  }

  return trimmed;
}

function serializeEditorHtml(editor: HTMLElement) {
  const clone = editor.cloneNode(true) as HTMLElement;

  clone.querySelectorAll(".rte-selected-image").forEach((element) => {
    element.classList.remove("rte-selected-image");
    if (!element.getAttribute("class")) {
      element.removeAttribute("class");
    }
  });

  return normalizeHtml(clone.innerHTML);
}

function buttonClass(active = false) {
  return cn(
    "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded px-2.5 text-sm font-semibold transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50",
    active ? "bg-slate-300 text-slate-950 shadow-inner" : "text-slate-700"
  );
}

function selectClass(widthClassName = "w-auto") {
  return cn(
    "h-8 rounded border-0 bg-transparent px-2 text-sm font-medium text-slate-700 outline-none hover:bg-slate-200 focus:bg-white focus:ring-1 focus:ring-[var(--color-border-focus)] disabled:cursor-not-allowed disabled:opacity-50",
    widthClassName
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px bg-slate-300" />;
}

export function RichTextEditor({
  label,
  value,
  onChange,
  error,
  hint,
  id,
  placeholder = "Enter content",
  fullWidth = true,
  minHeightClassName = "min-h-[420px]",
  disabled = false,
  testId,
  allowImageUpload = true,
}: RichTextEditorProps) {
  const generatedId = useId();
  const editorId = id ?? label?.toLowerCase().replace(/\s+/g, "-") ?? `rich-text-editor-${generatedId}`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [selectedAlignment, setSelectedAlignment] = useState<AlignmentCommand>("justifyLeft");
  const [blockStyle, setBlockStyle] = useState("P");
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value);
  const [fontSize, setFontSize] = useState("14px");
  const [lineHeight, setLineHeight] = useState("");
  const [textColor, setTextColor] = useState("#000000");
  const [highlightColor, setHighlightColor] = useState("#fff2a8");
  const [zoom, setZoom] = useState("100%");
  const [responsiveViewport, setResponsiveViewport] = useState<ResponsiveViewport>("desktop");
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [selectedImageWidth, setSelectedImageWidth] = useState("auto");
  const [selectedImagePlacement, setSelectedImagePlacement] = useState<ImagePlacement>("left");
  const [activeMarks, setActiveMarks] = useState<ActiveMarks>({
    bold: false,
    italic: false,
    underline: false,
    unorderedList: false,
    orderedList: false,
  });

  const selectedAlignmentAction = ALIGNMENT_ACTIONS.find((action) => action.command === selectedAlignment) ?? ALIGNMENT_ACTIONS[0];
  const selectedResponsiveViewport = RESPONSIVE_VIEWPORTS.find((viewport) => viewport.value === responsiveViewport) ?? RESPONSIVE_VIEWPORTS[1];

  useEffect(() => {
    document.execCommand("styleWithCSS", false, "true");
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", syncToolbarState);
    return () => document.removeEventListener("selectionchange", syncToolbarState);
  }, []);

  useEffect(() => {
    function handleOutsidePointerDown(event: globalThis.MouseEvent) {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      setOpenMenu(null);
    }

    document.addEventListener("mousedown", handleOutsidePointerDown);
    return () => document.removeEventListener("mousedown", handleOutsidePointerDown);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const normalizedValue = normalizeHtml(value);
    const currentValue = serializeEditorHtml(editor);

    if (currentValue !== normalizedValue) {
      editor.innerHTML = normalizedValue;
      setSelectedImage(null);
      setSelectedImageWidth("auto");
      setSelectedImagePlacement("left");
    }
  }, [value]);

  function saveSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const editor = editorRef.current;
    if (editor?.contains(range.commonAncestorContainer)) {
      selectionRef.current = range.cloneRange();
    }
  }

  function restoreSelection() {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    if (selectionRef.current) {
      selection.addRange(selectionRef.current);
    } else {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.addRange(range);
    }
  }

  function emitChange() {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(serializeEditorHtml(editor));
  }

  function runCommand(command: string, commandValue?: string) {
    if (disabled) return;

    setOpenMenu(null);
    if (isAlignmentCommand(command)) {
      setSelectedAlignment(command);
    }

    if (command !== "undo" && command !== "redo") {
      restoreSelection();
    } else {
      editorRef.current?.focus();
    }

    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, commandValue);
    saveSelection();
    emitChange();
    syncToolbarState();
  }

  function insertHtml(html: string) {
    if (disabled) return;

    setOpenMenu(null);
    restoreSelection();
    document.execCommand("insertHTML", false, html);
    saveSelection();
    emitChange();
    syncToolbarState();
  }

  function applyInlineStyle(style: Partial<CSSStyleDeclaration>, options: { closeMenu?: boolean } = {}) {
    if (disabled) return;

    const { closeMenu = true } = options;
    if (closeMenu) {
      setOpenMenu(null);
    }
    restoreSelection();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const hadSelection = Boolean(range.toString());
    const span = document.createElement("span");
    Object.assign(span.style, style);

    if (hadSelection) {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    } else {
      span.appendChild(document.createTextNode("\u200B"));
      range.insertNode(span);
    }

    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    if (!hadSelection) {
      nextRange.collapse(false);
    }
    selection.addRange(nextRange);
    saveSelection();
    emitChange();
    syncToolbarState();
  }

  function applyFontSize(nextSize: string) {
    setFontSize(nextSize);
    applyInlineStyle({ fontSize: nextSize });
  }

  function stepFontSize(direction: -1 | 1) {
    const currentIndex = FONT_SIZES.findIndex((option) => option.value === fontSize);
    const fallbackIndex = FONT_SIZES.findIndex((option) => option.value === "14px");
    const index = currentIndex >= 0 ? currentIndex : fallbackIndex;
    const next = FONT_SIZES[Math.min(FONT_SIZES.length - 1, Math.max(0, index + direction))];
    applyFontSize(next.value);
  }

  function applyFontFamily(nextFontFamily: string) {
    setFontFamily(nextFontFamily);
    applyInlineStyle({ fontFamily: nextFontFamily });
  }

  function applyLineHeight(nextLineHeight: string) {
    setLineHeight(nextLineHeight);
    applyInlineStyle({ lineHeight: nextLineHeight });
  }

  function applyTextColor(nextColor: string) {
    setTextColor(nextColor);
    applyInlineStyle({ color: nextColor }, { closeMenu: false });
  }

  function applyHighlightColor(nextColor: string) {
    setHighlightColor(nextColor);
    applyInlineStyle({ backgroundColor: nextColor }, { closeMenu: false });
  }

  function handleToolbarMouseDown(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("select,input")) return;
    event.preventDefault();
    saveSelection();
  }

  function selectImage(image: HTMLImageElement | null) {
    setSelectedImage((current) => {
      if (current && current !== image) {
        current.classList.remove("rte-selected-image");
      }

      if (image) {
        image.classList.add("rte-selected-image");
        setSelectedImageWidth(image.style.width || "auto");
        setSelectedImagePlacement(getImagePlacement(image));
      } else {
        setSelectedImageWidth("auto");
        setSelectedImagePlacement("left");
      }

      return image;
    });
  }

  function applyImageWidth(width: string) {
    if (!selectedImage || disabled) return;

    if (width === "auto") {
      selectedImage.style.removeProperty("width");
    } else {
      selectedImage.style.width = width;
    }

    selectedImage.style.maxWidth = "100%";
    selectedImage.style.height = "auto";
    selectedImage.style.display = "block";
    setSelectedImageWidth(width);
    emitChange();
  }

  function getImagePlacement(image: HTMLImageElement): ImagePlacement {
    const marginLeft = image.style.marginLeft;
    const marginRight = image.style.marginRight;

    if (marginLeft === "auto" && marginRight === "auto") return "center";
    if (marginLeft === "auto") return "right";
    return "left";
  }

  function applyImagePlacement(placement: ImagePlacement) {
    if (!selectedImage || disabled) return;

    selectedImage.style.display = "block";
    selectedImage.style.maxWidth = "100%";
    selectedImage.style.height = "auto";
    selectedImage.style.marginTop = "12px";
    selectedImage.style.marginBottom = "12px";

    if (placement === "center") {
      selectedImage.style.marginLeft = "auto";
      selectedImage.style.marginRight = "auto";
    } else if (placement === "right") {
      selectedImage.style.marginLeft = "auto";
      selectedImage.style.marginRight = "0";
    } else {
      selectedImage.style.marginLeft = "0";
      selectedImage.style.marginRight = "auto";
    }

    setSelectedImagePlacement(placement);
    emitChange();
  }

  function getMovableImageNode(image: HTMLImageElement): Node {
    const editor = editorRef.current;
    const parent = image.parentElement;
    const parentText = parent?.textContent?.replace(/\u200B/g, "").trim();

    if (editor && parent && parent !== editor && parent.childElementCount === 1 && !parentText) {
      return parent;
    }

    return image;
  }

  function getAdjacentContentSibling(node: Node, direction: "previous" | "next") {
    let sibling = direction === "previous" ? node.previousSibling : node.nextSibling;

    while (sibling && sibling.nodeType === Node.TEXT_NODE && !sibling.textContent?.trim()) {
      sibling = direction === "previous" ? sibling.previousSibling : sibling.nextSibling;
    }

    return sibling;
  }

  function moveSelectedImage(direction: "up" | "down") {
    if (!selectedImage || disabled) return;

    const node = getMovableImageNode(selectedImage);
    const parent = node.parentNode;
    if (!parent) return;

    if (direction === "up") {
      const previous = getAdjacentContentSibling(node, "previous");
      if (!previous) return;
      parent.insertBefore(node, previous);
    } else {
      const next = getAdjacentContentSibling(node, "next");
      if (!next) return;
      parent.insertBefore(next, node);
    }

    selectedImage.classList.add("rte-selected-image");
    emitChange();
  }

  function handleImageWidthInput(nextWidth: string) {
    setSelectedImageWidth(nextWidth);
    const trimmedWidth = nextWidth.trim();
    if (!trimmedWidth) return;
    applyImageWidth(trimmedWidth);
  }

  function syncToolbarState() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const node = selection.anchorNode;
    if (!node || !editor.contains(node)) return;

    const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
    if (!element) return;

    const block = element.closest("h1,h2,h3,blockquote,pre,p,div")?.tagName ?? "P";
    setBlockStyle(block === "DIV" ? "P" : block);

    const computed = window.getComputedStyle(element);
    const matchedFont = FONT_FAMILIES.find((option) =>
      computed.fontFamily.toLowerCase().includes(option.label.toLowerCase()) ||
      computed.fontFamily.toLowerCase().includes(option.value.split(",")[0].replace(/"/g, "").toLowerCase())
    );
    if (matchedFont) setFontFamily(matchedFont.value);

    const roundedSize = `${Math.round(Number.parseFloat(computed.fontSize))}px`;
    if (FONT_SIZES.some((option) => option.value === roundedSize)) {
      setFontSize(roundedSize);
    }

    const roundedLineHeight = computed.lineHeight === "normal"
      ? ""
      : String(Number.parseFloat((Number.parseFloat(computed.lineHeight) / Number.parseFloat(computed.fontSize)).toFixed(2)));
    const matchedLineHeight = LINE_HEIGHTS.find((option) => Math.abs(Number(option.value) - Number(roundedLineHeight)) < 0.08);
    setLineHeight(matchedLineHeight?.value ?? "");

    setTextColor(rgbToHex(computed.color) ?? "#000000");
    setHighlightColor(rgbToHex(computed.backgroundColor) ?? "#fff2a8");

    setActiveMarks({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      unorderedList: document.queryCommandState("insertUnorderedList"),
      orderedList: document.queryCommandState("insertOrderedList"),
    });

    if (document.queryCommandState("justifyCenter")) setSelectedAlignment("justifyCenter");
    else if (document.queryCommandState("justifyRight")) setSelectedAlignment("justifyRight");
    else if (document.queryCommandState("justifyFull")) setSelectedAlignment("justifyFull");
    else setSelectedAlignment("justifyLeft");
  }

  function insertLink() {
    const url = window.prompt("Enter link URL");
    if (!url) return;
    runCommand("createLink", url);
  }

  function insertImageUrl() {
    const url = window.prompt("Enter image URL");
    if (!url) return;
    insertHtml(`<img src="${escapeAttribute(url)}" alt="" style="max-width:100%;height:auto;border-radius:12px;margin:12px 0;display:block;" />`);
  }

  function insertTable() {
    const rows = Math.max(1, Number(window.prompt("Rows", "3")) || 3);
    const cols = Math.max(1, Number(window.prompt("Columns", "3")) || 3);
    const cells = Array.from({ length: cols })
      .map(() => `<td style="border:1px solid #CBD5E1;padding:10px;min-width:96px;">&nbsp;</td>`)
      .join("");
    const body = Array.from({ length: rows })
      .map(() => `<tr>${cells}</tr>`)
      .join("");

    insertHtml(`<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;"><tbody>${body}</tbody></table><p><br /></p>`);
  }

  function insertResponsiveContainer() {
    insertHtml(`
      <div style="width:100%;max-width:960px;margin:0 auto;padding:24px;border:1px solid #CBD5E1;border-radius:16px;background:#FFFFFF;">
        <h2 style="margin:0 0 8px 0;font-size:24px;line-height:1.25;">Responsive section</h2>
        <p style="margin:0;color:#475569;line-height:1.6;">Add your content here. This section stays fluid and centered.</p>
      </div>
      <p><br /></p>
    `);
  }

  function insertTwoColumns() {
    insertHtml(`
      <div style="display:flex;flex-wrap:wrap;gap:16px;width:100%;margin:16px 0;align-items:stretch;">
        <div style="flex:1 1 280px;min-width:0;padding:16px;border:1px solid #CBD5E1;border-radius:14px;background:#FFFFFF;">
          <h3 style="margin:0 0 8px 0;font-size:18px;line-height:1.3;">Column one</h3>
          <p style="margin:0;color:#475569;line-height:1.6;">This column stacks on small screens.</p>
        </div>
        <div style="flex:1 1 280px;min-width:0;padding:16px;border:1px solid #CBD5E1;border-radius:14px;background:#FFFFFF;">
          <h3 style="margin:0 0 8px 0;font-size:18px;line-height:1.3;">Column two</h3>
          <p style="margin:0;color:#475569;line-height:1.6;">This column sits beside the first one on wider screens.</p>
        </div>
      </div>
      <p><br /></p>
    `);
  }

  function insertThreeCards() {
    insertHtml(`
      <div style="display:flex;flex-wrap:wrap;gap:16px;width:100%;margin:16px 0;">
        <div style="flex:1 1 220px;min-width:0;padding:16px;border:1px solid #CBD5E1;border-radius:14px;background:#F8FAFC;">
          <h3 style="margin:0 0 8px 0;font-size:17px;line-height:1.3;">Card one</h3>
          <p style="margin:0;color:#475569;line-height:1.6;">Short responsive card content.</p>
        </div>
        <div style="flex:1 1 220px;min-width:0;padding:16px;border:1px solid #CBD5E1;border-radius:14px;background:#F8FAFC;">
          <h3 style="margin:0 0 8px 0;font-size:17px;line-height:1.3;">Card two</h3>
          <p style="margin:0;color:#475569;line-height:1.6;">Cards wrap naturally as width reduces.</p>
        </div>
        <div style="flex:1 1 220px;min-width:0;padding:16px;border:1px solid #CBD5E1;border-radius:14px;background:#F8FAFC;">
          <h3 style="margin:0 0 8px 0;font-size:17px;line-height:1.3;">Card three</h3>
          <p style="margin:0;color:#475569;line-height:1.6;">Useful for feature or service blocks.</p>
        </div>
      </div>
      <p><br /></p>
    `);
  }

  function insertImageTextBlock() {
    insertHtml(`
      <div style="display:flex;flex-wrap:wrap;gap:24px;width:100%;margin:16px 0;align-items:center;">
        <div style="flex:1 1 320px;min-width:0;">
          <h2 style="margin:0 0 10px 0;font-size:26px;line-height:1.2;">Image and text</h2>
          <p style="margin:0;color:#475569;line-height:1.7;">Replace this text and image. The image moves below the text on small screens.</p>
        </div>
        <div style="flex:1 1 320px;min-width:0;">
          <div style="width:100%;min-height:180px;border-radius:16px;background:#E2E8F0;display:flex;align-items:center;justify-content:center;color:#64748B;">Image area</div>
        </div>
      </div>
      <p><br /></p>
    `);
  }

  function insertHeroSection() {
    insertHtml(`
      <div style="display:flex;flex-wrap:wrap;gap:28px;width:100%;margin:16px 0;padding:28px;border-radius:20px;background:#EEF2FF;align-items:center;">
        <div style="flex:1 1 340px;min-width:0;">
          <p style="margin:0 0 8px 0;color:#4F46E5;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Hero section</p>
          <h1 style="margin:0 0 12px 0;font-size:34px;line-height:1.1;color:#0F172A;">Build a responsive page section</h1>
          <p style="margin:0 0 18px 0;color:#475569;line-height:1.7;">This block uses flex wrap, so it adapts from desktop to mobile with the same HTML.</p>
          <a href="#" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#2563EB;color:#FFFFFF;text-decoration:none;font-weight:700;">Call to action</a>
        </div>
        <div style="flex:1 1 280px;min-width:0;">
          <div style="width:100%;min-height:220px;border-radius:18px;background:#CBD5E1;display:flex;align-items:center;justify-content:center;color:#475569;">Visual area</div>
        </div>
      </div>
      <p><br /></p>
    `);
  }

  function insertButtonRow() {
    insertHtml(`
      <div style="display:flex;flex-wrap:wrap;gap:12px;width:100%;margin:16px 0;align-items:center;">
        <a href="#" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#2563EB;color:#FFFFFF;text-decoration:none;font-weight:700;">Primary action</a>
        <a href="#" style="display:inline-block;padding:10px 16px;border-radius:999px;border:1px solid #CBD5E1;color:#0F172A;text-decoration:none;font-weight:700;">Secondary action</a>
      </div>
      <p><br /></p>
    `);
  }

  function insertVerticalLine() {
    insertHtml(`<span style="display:inline-block;width:1px;height:1.4em;border-left:2px solid currentColor;margin:0 10px;vertical-align:middle;">&nbsp;</span>`);
  }

  function handleImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      insertHtml(`<img src="${escapeAttribute(src)}" alt="${escapeAttribute(file.name)}" style="max-width:100%;height:auto;border-radius:12px;margin:12px 0;display:block;" />`);
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.ctrlKey || event.metaKey)) return;

    const key = event.key.toLowerCase();

    if (key === "b") {
      event.preventDefault();
      runCommand("bold");
    }
    if (key === "i") {
      event.preventDefault();
      runCommand("italic");
    }
    if (key === "u") {
      event.preventDefault();
      runCommand("underline");
    }
    if (key === "z") {
      event.preventDefault();
      runCommand(event.shiftKey ? "redo" : "undo");
    }
  }

  function toggleMenu(menu: Exclude<MenuKey, null>) {
    saveSelection();
    setOpenMenu((current) => current === menu ? null : menu);
  }

  return (
    <div ref={rootRef} className={cn("flex flex-col gap-1.5", fullWidth && "w-full")} data-testid={testId}>
      {label ? (
        <label htmlFor={editorId} className="ds-form-label">
          {label}
        </label>
      ) : null}

      <div
        className={cn(
          "overflow-visible rounded-[var(--radius-control)] border bg-white",
          "border-[color:color-mix(in_srgb,var(--color-border)_78%,white)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
          isFocused && "border-[color:color-mix(in_srgb,var(--color-border-focus)_70%,white)] ring-2 ring-[color:color-mix(in_srgb,var(--color-border-focus)_14%,transparent)]",
          error && "border-[var(--color-danger)] ring-0",
          disabled && "opacity-60"
        )}
      >
        <div
          className="relative z-10 flex flex-wrap items-center gap-0 border-b border-slate-300 bg-slate-100 px-2 py-1"
          onMouseDownCapture={saveSelection}
          onPointerDownCapture={saveSelection}
          onMouseDown={handleToolbarMouseDown}
        >
          <button type="button" title="Undo" disabled={disabled} onMouseDown={saveSelection} onClick={() => runCommand("undo")} className={buttonClass()}>
            <UndoIcon />
          </button>
          <button type="button" title="Redo" disabled={disabled} onMouseDown={saveSelection} onClick={() => runCommand("redo")} className={buttonClass()}>
            <RedoIcon />
          </button>

          <Divider />

          <select aria-label="Zoom" className={selectClass("w-[86px]")} value={zoom} disabled={disabled} onChange={(event) => setZoom(event.target.value)}>
            <option>75%</option>
            <option>90%</option>
            <option>100%</option>
            <option>125%</option>
            <option>150%</option>
          </select>

          <select
            aria-label="Responsive preview"
            className={selectClass("w-[112px]")}
            value={responsiveViewport}
            disabled={disabled}
            onChange={(event) => setResponsiveViewport(event.target.value as ResponsiveViewport)}
          >
            {RESPONSIVE_VIEWPORTS.map((viewport) => (
              <option key={viewport.value} value={viewport.value}>
                {viewport.label}
              </option>
            ))}
          </select>

          <Divider />

          <select aria-label="Text style" className={selectClass("w-[132px]")} disabled={disabled} value={blockStyle} onMouseDown={saveSelection} onChange={(event) => { setBlockStyle(event.target.value); runCommand("formatBlock", event.target.value); }}>
            {BLOCK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Divider />

          <select aria-label="Font family" className={selectClass("w-[118px]")} disabled={disabled} value={fontFamily} onMouseDown={saveSelection} onChange={(event) => applyFontFamily(event.target.value)}>
            {FONT_FAMILIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Divider />

          <button type="button" title="Decrease font size" disabled={disabled} onMouseDown={saveSelection} onClick={() => stepFontSize(-1)} className={buttonClass()}>
            -
          </button>
          <select aria-label="Font size" className={selectClass("w-[58px] rounded border border-slate-300 bg-white text-center")} disabled={disabled} value={fontSize} onMouseDown={saveSelection} onChange={(event) => applyFontSize(event.target.value)}>
            {FONT_SIZES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" title="Increase font size" disabled={disabled} onMouseDown={saveSelection} onClick={() => stepFontSize(1)} className={buttonClass()}>
            +
          </button>

          <Divider />

          <button type="button" title="Bold" disabled={disabled} onMouseDown={saveSelection} onClick={() => runCommand("bold")} className={buttonClass(activeMarks.bold)}>
            B
          </button>
          <button type="button" title="Italic" disabled={disabled} onMouseDown={saveSelection} onClick={() => runCommand("italic")} className={buttonClass(activeMarks.italic)}>
            <span className="italic">I</span>
          </button>
          <button type="button" title="Underline" disabled={disabled} onMouseDown={saveSelection} onClick={() => runCommand("underline")} className={buttonClass(activeMarks.underline)}>
            <span className="underline">U</span>
          </button>
          <div className="relative">
            <button
              type="button"
              title="Text color"
              disabled={disabled}
              className={cn(buttonClass(), "gap-1")}
              onClick={() => toggleMenu("textColor")}
            >
              A
              <span className="h-1.5 w-6 rounded-sm border border-slate-400" style={{ backgroundColor: textColor }} />
              <ChevronDownIcon />
            </button>
            {openMenu === "textColor" ? (
              <ColorMenu label="Text color" selectedColor={textColor} onSelect={applyTextColor} />
            ) : null}
          </div>
          <div className="relative">
            <button
              type="button"
              title="Highlight color"
              disabled={disabled}
              className={cn(buttonClass(), "gap-1")}
              onClick={() => toggleMenu("highlightColor")}
            >
              <PenIcon />
              <span className="h-3.5 w-3.5 rounded-sm border border-slate-400" style={{ backgroundColor: highlightColor }} />
              <ChevronDownIcon />
            </button>
            {openMenu === "highlightColor" ? (
              <ColorMenu label="Highlight color" selectedColor={highlightColor} onSelect={applyHighlightColor} />
            ) : null}
          </div>

          <Divider />

          <button type="button" title="Link" disabled={disabled} onMouseDown={saveSelection} onClick={insertLink} className={buttonClass()}>
            <LinkIcon />
          </button>
          <button type="button" title="Image URL" disabled={disabled} onMouseDown={saveSelection} onClick={insertImageUrl} className={buttonClass()}>
            <ImageIcon />
          </button>
          {allowImageUpload ? (
            <>
              <button type="button" title="Upload image" disabled={disabled} onMouseDown={saveSelection} onClick={() => fileInputRef.current?.click()} className={buttonClass()}>
                <UploadImageIcon />
              </button>
              <input ref={fileInputRef} className="hidden" type="file" accept="image/*" onChange={handleImageFile} />
            </>
          ) : null}

          <Divider />

          <div className="relative">
            <button type="button" title="Alignment" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => toggleMenu("align")} className={cn(buttonClass(), "min-w-[86px] justify-between")}>
              <MenuLabel icon={selectedAlignmentAction.icon} text={selectedAlignmentAction.text} />
              <ChevronDownIcon />
            </button>
            {openMenu === "align" ? (
              <Menu>
                {ALIGNMENT_ACTIONS.map((action) => (
                  <MenuItem key={action.command} disabled={disabled} onMouseDown={saveSelection} onClick={() => runCommand(action.command)}>
                    {action.label}
                  </MenuItem>
                ))}
              </Menu>
            ) : null}
          </div>

          <select aria-label="Line height" className={selectClass("w-[90px]")} disabled={disabled} value={lineHeight} onMouseDown={saveSelection} onChange={(event) => applyLineHeight(event.target.value)}>
            <option value="">Spacing</option>
            {LINE_HEIGHTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <button type="button" title="Lists and indent" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => toggleMenu("list")} className={buttonClass(activeMarks.unorderedList || activeMarks.orderedList)}>
              <BulletedListIcon />
              <ChevronDownIcon />
            </button>
            {openMenu === "list" ? (
              <Menu>
                {LIST_ACTIONS.map((action) => (
                  <MenuItem key={action.command} disabled={disabled} onMouseDown={saveSelection} onClick={() => runCommand(action.command)}>
                    {action.label}
                  </MenuItem>
                ))}
              </Menu>
            ) : null}
          </div>

          <button type="button" title="Decrease indent" disabled={disabled} onMouseDown={saveSelection} onClick={() => runCommand("outdent")} className={buttonClass()}>
            <OutdentIcon />
          </button>
          <button type="button" title="Increase indent" disabled={disabled} onMouseDown={saveSelection} onClick={() => runCommand("indent")} className={buttonClass()}>
            <IndentIcon />
          </button>

          <Divider />

          <div className="relative">
            <button type="button" title="Insert" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => toggleMenu("insert")} className={buttonClass()}>
              <PlusIcon />
              <ChevronDownIcon />
            </button>
            {openMenu === "insert" ? (
              <Menu className="w-56">
                <MenuItem disabled={disabled} onMouseDown={saveSelection} onClick={insertLink}>Link</MenuItem>
                <MenuItem disabled={disabled} onMouseDown={saveSelection} onClick={insertImageUrl}>Image URL</MenuItem>
                {allowImageUpload ? <MenuItem disabled={disabled} onMouseDown={saveSelection} onClick={() => { setOpenMenu(null); fileInputRef.current?.click(); }}>Upload image</MenuItem> : null}
                <MenuItem disabled={disabled} onMouseDown={saveSelection} onClick={insertTable}>Table</MenuItem>
                <MenuItem disabled={disabled} onMouseDown={saveSelection} onClick={() => runCommand("insertHorizontalRule")}>Horizontal line</MenuItem>
                <MenuItem disabled={disabled} onMouseDown={saveSelection} onClick={insertVerticalLine}>Vertical line</MenuItem>
                <MenuSeparator />
                <MenuItem disabled={disabled} onMouseDown={saveSelection} onClick={insertResponsiveContainer}>Responsive container</MenuItem>
                <MenuItem disabled={disabled} onMouseDown={saveSelection} onClick={insertTwoColumns}>Two columns</MenuItem>
                <MenuItem disabled={disabled} onMouseDown={saveSelection} onClick={insertThreeCards}>Three cards</MenuItem>
                <MenuItem disabled={disabled} onMouseDown={saveSelection} onClick={insertImageTextBlock}>Image + text</MenuItem>
                <MenuItem disabled={disabled} onMouseDown={saveSelection} onClick={insertHeroSection}>Hero section</MenuItem>
                <MenuItem disabled={disabled} onMouseDown={saveSelection} onClick={insertButtonRow}>Button row</MenuItem>
              </Menu>
            ) : null}
          </div>

          <button type="button" title="Clear formatting" disabled={disabled} onMouseDown={saveSelection} onClick={() => runCommand("removeFormat")} className={buttonClass()}>
            Tx
          </button>
        </div>

        {selectedImage ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 text-sm">
            <span className="font-semibold text-slate-700">Image size</span>
            <button type="button" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyImageWidth("auto")} className={cn(buttonClass(selectedImageWidth === "auto"), "h-8 min-w-0 text-xs")}>
              Auto
            </button>
            {IMAGE_WIDTH_OPTIONS.map((width) => (
              <button key={width} type="button" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyImageWidth(width)} className={cn(buttonClass(selectedImageWidth === width), "h-8 min-w-0 text-xs")}>
                {width}
              </button>
            ))}
            <input
              aria-label="Custom image width"
              value={selectedImageWidth === "auto" ? "" : selectedImageWidth}
              disabled={disabled}
              placeholder="320px or 60%"
              onMouseDown={(event) => event.preventDefault()}
              onChange={(event) => handleImageWidthInput(event.target.value)}
              className="h-8 w-32 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-[var(--color-border-focus)]"
            />
            <Divider />
            <span className="font-semibold text-slate-700">Place</span>
            {IMAGE_PLACEMENTS.map((placement) => (
              <button key={placement.value} type="button" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => applyImagePlacement(placement.value)} className={cn(buttonClass(selectedImagePlacement === placement.value), "h-8 min-w-0 text-xs")}>
                {placement.label}
              </button>
            ))}
            <Divider />
            <button type="button" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => moveSelectedImage("up")} className={cn(buttonClass(), "h-8 min-w-0 text-xs")}>
              Move up
            </button>
            <button type="button" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => moveSelectedImage("down")} className={cn(buttonClass(), "h-8 min-w-0 text-xs")}>
              Move down
            </button>
          </div>
        ) : null}

        <div className="relative overflow-auto bg-slate-100 px-4 py-6 sm:px-8">
          {!normalizeHtml(value) && !isFocused ? (
            <div className="pointer-events-none absolute left-8 top-10 text-sm text-[var(--color-text-secondary)] sm:left-16">
              {placeholder}
            </div>
          ) : null}
          <div
            ref={editorRef}
            id={editorId}
            contentEditable={!disabled}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-invalid={!!error}
            aria-disabled={disabled}
            data-testid={testId ? `${testId}-input` : undefined}
            data-rte-editor="true"
            className={cn(
              "mx-auto w-full max-w-[920px] overflow-auto rounded-sm border border-slate-200 bg-white px-10 py-8 text-sm leading-6 text-[var(--color-text-primary)] shadow-[0_18px_45px_rgba(15,23,42,0.14)] focus:outline-none sm:px-14 sm:py-10",
              "[&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic",
              "[&_hr]:my-4 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-slate-300",
              "[&_img]:cursor-pointer [&_img]:max-w-full [&_.rte-selected-image]:outline [&_.rte-selected-image]:outline-2 [&_.rte-selected-image]:outline-offset-4 [&_.rte-selected-image]:outline-blue-500",
              "[&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc",
              "[&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-white",
              minHeightClassName
            )}
            style={{
              maxWidth: selectedResponsiveViewport.maxWidth,
              transform: `scale(${Number.parseInt(zoom, 10) / 100})`,
              transformOrigin: "top center",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
            onFocus={() => {
              setIsFocused(true);
              saveSelection();
              syncToolbarState();
            }}
            onBlur={() => {
              setIsFocused(false);
              saveSelection();
              emitChange();
            }}
            onInput={() => {
              saveSelection();
              emitChange();
              syncToolbarState();
            }}
            onKeyDown={handleKeyDown}
            onKeyUp={() => {
              saveSelection();
              syncToolbarState();
            }}
            onMouseUp={() => {
              saveSelection();
              syncToolbarState();
            }}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              const image = target.closest("img");
              selectImage(image && editorRef.current?.contains(image) ? image as HTMLImageElement : null);
            }}
          />
        </div>
      </div>

      {hint && !error ? <p className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">{hint}</p> : null}
      {error ? <p role="alert" className="text-[length:var(--text-xs)] text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}

function Menu({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("absolute left-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl", className)}>
      {children}
    </div>
  );
}

function MenuSeparator() {
  return <div className="my-1 h-px bg-slate-200" />;
}

function ColorMenu({
  label,
  selectedColor,
  onSelect,
}: {
  label: string;
  selectedColor: string;
  onSelect: (color: string) => void;
}) {
  return (
    <div
      className="absolute left-0 top-full z-30 mt-2 w-32 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-xs font-semibold leading-4 text-slate-600">{label}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] uppercase leading-4 text-slate-500">{selectedColor}</span>
      </div>
      <label className="relative block cursor-pointer rounded-md border border-slate-300 bg-white p-1 shadow-sm">
        <span className="block h-8 rounded-sm" style={{ backgroundColor: selectedColor }} />
        <input
          type="color"
          aria-label={label}
          value={selectedColor}
          onMouseDown={(event) => event.preventDefault()}
          onChange={(event) => onSelect(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

function MenuItem({
  children,
  disabled,
  onMouseDown,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onMouseDown: () => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown();
      }}
      onClick={onClick}
      className="flex w-full items-center px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function MenuLabel({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      <span>{text}</span>
    </span>
  );
}

function isAlignmentCommand(command: string): command is AlignmentCommand {
  return command === "justifyLeft" || command === "justifyCenter" || command === "justifyRight" || command === "justifyFull";
}

function EditorIcon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function UndoIcon() {
  return <EditorIcon><path d="M8 7H4V3" /><path d="M4 7a7 7 0 1 1 2 5" /></EditorIcon>;
}

function RedoIcon() {
  return <EditorIcon><path d="M12 7h4V3" /><path d="M16 7a7 7 0 1 0-2 5" /></EditorIcon>;
}

function LinkIcon() {
  return <EditorIcon><path d="M8.5 6.5 10 5a3 3 0 0 1 4.2 4.2l-2 2a3 3 0 0 1-4.2 0" /><path d="M11.5 13.5 10 15a3 3 0 0 1-4.2-4.2l2-2a3 3 0 0 1 4.2 0" /></EditorIcon>;
}

function ImageIcon() {
  return <EditorIcon><path d="M4 5h12v10H4z" /><path d="m6 13 3-3 2 2 2-3 3 4" /><path d="M7 8h.01" /></EditorIcon>;
}

function UploadImageIcon() {
  return <EditorIcon><path d="M4 15h12" /><path d="M10 4v8" /><path d="m7 7 3-3 3 3" /></EditorIcon>;
}

function PenIcon() {
  return <EditorIcon><path d="m4 14 1 2 2-1 8-8-3-3-8 8Z" /><path d="m11 5 3 3" /></EditorIcon>;
}

function PlusIcon() {
  return <EditorIcon><path d="M10 4v12" /><path d="M4 10h12" /></EditorIcon>;
}

function ChevronDownIcon() {
  return <EditorIcon><path d="m6 8 4 4 4-4" /></EditorIcon>;
}

function AlignLeftIcon() {
  return <EditorIcon><path d="M3 5h12M3 9h8M3 13h12M3 17h7" /></EditorIcon>;
}

function AlignCenterIcon() {
  return <EditorIcon><path d="M4 5h12M6 9h8M4 13h12M6.5 17h7" /></EditorIcon>;
}

function AlignRightIcon() {
  return <EditorIcon><path d="M5 5h12M9 9h8M5 13h12M10 17h7" /></EditorIcon>;
}

function AlignJustifyIcon() {
  return <EditorIcon><path d="M3 5h14M3 9h14M3 13h14M3 17h14" /></EditorIcon>;
}

function BulletedListIcon() {
  return <EditorIcon><path d="M5 6h.01M5 10h.01M5 14h.01M8 6h8M8 10h8M8 14h8" /></EditorIcon>;
}

function NumberedListIcon() {
  return <EditorIcon><path d="M4 6h1M4 10h1M4 14h1M8 6h8M8 10h8M8 14h8" /></EditorIcon>;
}

function OutdentIcon() {
  return <EditorIcon><path d="M10 5h7M10 9h7M10 13h7M10 17h7M7 8l-3 3 3 3" /></EditorIcon>;
}

function IndentIcon() {
  return <EditorIcon><path d="M10 5h7M10 9h7M10 13h7M10 17h7M4 8l3 3-3 3" /></EditorIcon>;
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function rgbToHex(value: string) {
  if (!value || value === "transparent" || value === "rgba(0, 0, 0, 0)") return null;
  if (value.startsWith("#")) return value;

  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return null;

  return `#${[match[1], match[2], match[3]]
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")}`;
}
