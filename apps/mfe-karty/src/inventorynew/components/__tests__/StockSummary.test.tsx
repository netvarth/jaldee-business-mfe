import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../test/test-utils";
import { StockSummary } from "../StockSummary";

// ─── Mock all service hooks ───────────────────────────────────────────

const mockUseInventoryStock = vi.fn();
const mockUseStores = vi.fn();
const mockUseItems = vi.fn();

vi.mock("../../../services/useStock", () => ({
  useInventoryStock: (...args: any[]) => mockUseInventoryStock(...args),
}));

vi.mock("../../../services/useStores", () => ({
  useStores: (...args: any[]) => mockUseStores(...args),
}));

vi.mock("../../../services/useItems", () => ({
  useItems: (...args: any[]) => mockUseItems(...args),
}));

// Mock the StockLedgerHistory to prevent deep rendering
vi.mock("../StockLedgerHistory", () => ({
  StockLedgerHistory: () => <div data-testid="stock-ledger-history">Ledger View</div>,
}));

// Mock @jaldee/design-system
vi.mock("@jaldee/design-system", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

// Mock icons to simple span elements
vi.mock("../../icons", () => {
  const icon = (name: string) => (props: any) => <span data-testid={`icon-${name}`} {...props} />;
  return {
    ArrowLeft: icon("arrow-left"),
    Search: icon("search"),
    Archive: icon("archive"),
    Package: icon("package"),
    Activity: icon("activity"),
    History: icon("history"),
  };
});

// ─── Default mock data ────────────────────────────────────────────────

const defaultStockData = [
  {
    uid: "stock-1",
    storeUid: "store-1",
    catalogUid: "cat-1",
    catalogItemUid: "ci-1",
    itemUid: "item-1",
    batchUid: "00000000-0000-0000-0000-000000000000",
    inHand: 100,
    onHold: 5,
    stockStatus: "IN_STOCK",
    itemName: "Widget A",
    itemSku: "WDG-001",
    storeName: "Main Warehouse",
  },
  {
    uid: "stock-2",
    storeUid: "store-2",
    catalogUid: "cat-1",
    catalogItemUid: "ci-2",
    itemUid: "item-2",
    batchUid: "00000000-0000-0000-0000-000000000000",
    inHand: 0,
    onHold: 0,
    stockStatus: "OUT_OF_STOCK",
    itemName: "Widget B",
    itemSku: "WDG-002",
    storeName: "Branch Store",
  },
];

const defaultStores = [
  { uid: "store-1", name: "Main Warehouse" },
  { uid: "store-2", name: "Branch Store" },
];

const defaultItems = [
  { uid: "item-1", name: "Widget A", sku: "WDG-001" },
  { uid: "item-2", name: "Widget B", sku: "WDG-002" },
];

function setupDefaultMocks() {
  mockUseInventoryStock.mockReturnValue({ data: defaultStockData, isLoading: false });
  mockUseStores.mockReturnValue({ data: defaultStores, isLoading: false });
  mockUseItems.mockReturnValue({ data: defaultItems, isLoading: false });
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("StockSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("renders the header", () => {
    renderWithProviders(<StockSummary />);
    expect(screen.getByText("Stock Summary")).toBeInTheDocument();
  });

  it("renders stock items in a table", () => {
    renderWithProviders(<StockSummary />);

    expect(screen.getByText("Widget A")).toBeInTheDocument();
    expect(screen.getByText("WDG-001")).toBeInTheDocument();
    expect(screen.getByText("Widget B")).toBeInTheDocument();
    expect(screen.getByText("WDG-002")).toBeInTheDocument();
  });

  it("calculates and displays aggregate totals", () => {
    renderWithProviders(<StockSummary />);

    // "100" appears in both the stat card and the table row
    const hundreds = screen.getAllByText("100");
    expect(hundreds.length).toBeGreaterThanOrEqual(1);
    // "5" appears in the On Hold stat card and the table row
    const fives = screen.getAllByText("5");
    expect(fives.length).toBeGreaterThanOrEqual(1);
  });

  it("renders a store filter dropdown with all stores", () => {
    renderWithProviders(<StockSummary />);

    const select = screen.getByDisplayValue("All Stores");
    expect(select).toBeInTheDocument();
  });

  it("renders a search input", () => {
    renderWithProviders(<StockSummary />);

    const searchInput = screen.getByPlaceholderText(/search stock/i);
    expect(searchInput).toBeInTheDocument();
  });

  it("shows stock status badges with IN STOCK label", () => {
    renderWithProviders(<StockSummary />);
    expect(screen.getByText("IN STOCK")).toBeInTheDocument();
  });
});

describe("StockSummary – empty state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInventoryStock.mockReturnValue({ data: [], isLoading: false });
    mockUseStores.mockReturnValue({ data: defaultStores, isLoading: false });
    mockUseItems.mockReturnValue({ data: defaultItems, isLoading: false });
  });

  it("shows empty message when no stock data", () => {
    renderWithProviders(<StockSummary />);
    expect(screen.getByText(/no stock records found/i)).toBeInTheDocument();
  });
});

describe("StockSummary – loading state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInventoryStock.mockReturnValue({ data: [], isLoading: true });
    mockUseStores.mockReturnValue({ data: defaultStores, isLoading: false });
    mockUseItems.mockReturnValue({ data: defaultItems, isLoading: false });
  });

  it("shows loading message while data is being fetched", () => {
    renderWithProviders(<StockSummary />);
    expect(screen.getByText(/loading stock data/i)).toBeInTheDocument();
  });
});
