/**
 * Deterministic Business Studio Financial Calculators (Stage 8).
 * All HPP/Pricing, Break-Even Analysis, and Cash Flow calculations run in strict,
 * auditable TypeScript — NEVER delegated to probabilistic LLM text generation.
 */

export interface CostLineItem {
  name: string;
  amountIdr: number;
}

export interface HppPricingInput {
  batchUnits: number;
  directMaterials: CostLineItem[];
  directLabor: CostLineItem[];
  overheadCosts: CostLineItem[];
  targetMarginPct?: number; // e.g. 30 for 30% gross margin on selling price
  sellingPriceIdr?: number; // optional explicit selling price override
}

export interface HppPricingResult {
  batchUnits: number;
  totalMaterialsIdr: number;
  totalLaborIdr: number;
  totalOverheadIdr: number;
  totalBatchCostIdr: number;
  hppPerUnitIdr: number;
  sellingPriceIdr: number;
  grossProfitPerUnitIdr: number;
  grossMarginPct: number;
  markupPct: number;
  warnings: string[];
}

function sumPositive(items: CostLineItem[]): number {
  return items.reduce((sum, item) => {
    const val = Number(item.amountIdr);
    return sum + (Number.isFinite(val) && val > 0 ? val : 0);
  }, 0);
}

export function calculateHppAndPricing(input: HppPricingInput): HppPricingResult {
  const warnings: string[] = [];
  const batchUnits = Math.max(1, Math.round(Number(input.batchUnits) || 1));
  const totalMaterialsIdr = Math.round(sumPositive(input.directMaterials));
  const totalLaborIdr = Math.round(sumPositive(input.directLabor));
  const totalOverheadIdr = Math.round(sumPositive(input.overheadCosts));
  const totalBatchCostIdr = totalMaterialsIdr + totalLaborIdr + totalOverheadIdr;
  const hppPerUnitIdr = Math.round(totalBatchCostIdr / batchUnits);

  let sellingPriceIdr: number;
  if (typeof input.sellingPriceIdr === 'number' && Number.isFinite(input.sellingPriceIdr) && input.sellingPriceIdr > 0) {
    sellingPriceIdr = Math.round(input.sellingPriceIdr);
  } else {
    const rawMargin = Number(input.targetMarginPct ?? 30);
    const safeMarginPct = Math.max(0, Math.min(95, Number.isFinite(rawMargin) ? rawMargin : 30));
    if (rawMargin >= 95) {
      warnings.push('Target margin capped at 95% to prevent division instability.');
    }
    sellingPriceIdr = hppPerUnitIdr > 0 ? Math.ceil(hppPerUnitIdr / (1 - safeMarginPct / 100)) : 0;
  }

  const grossProfitPerUnitIdr = sellingPriceIdr - hppPerUnitIdr;
  const grossMarginPct = sellingPriceIdr > 0 ? +((grossProfitPerUnitIdr / sellingPriceIdr) * 100).toFixed(2) : 0;
  const markupPct = hppPerUnitIdr > 0 ? +((grossProfitPerUnitIdr / hppPerUnitIdr) * 100).toFixed(2) : 0;

  if (sellingPriceIdr > 0 && grossProfitPerUnitIdr <= 0) {
    warnings.push('Selling price is at or below HPP per unit (negative or zero gross margin).');
  }

  return {
    batchUnits,
    totalMaterialsIdr,
    totalLaborIdr,
    totalOverheadIdr,
    totalBatchCostIdr,
    hppPerUnitIdr,
    sellingPriceIdr,
    grossProfitPerUnitIdr,
    grossMarginPct,
    markupPct,
    warnings,
  };
}

export interface BreakEvenInput {
  fixedCostsPerMonthIdr: number;
  sellingPricePerUnitIdr: number;
  variableCostPerUnitIdr: number;
  projectedMonthlyUnits?: number;
}

export interface BreakEvenResult {
  reachable: boolean;
  contributionMarginPerUnitIdr: number;
  contributionMarginRatioPct: number;
  breakEvenUnits: number | null;
  breakEvenRevenueIdr: number | null;
  marginOfSafetyUnits: number | null;
  warning?: string;
}

export function calculateBreakEven(input: BreakEvenInput): BreakEvenResult {
  const fixed = Math.max(0, Math.round(Number(input.fixedCostsPerMonthIdr) || 0));
  const price = Math.max(0, Math.round(Number(input.sellingPricePerUnitIdr) || 0));
  const variable = Math.max(0, Math.round(Number(input.variableCostPerUnitIdr) || 0));
  const contribution = price - variable;
  const cmRatio = price > 0 ? +((contribution / price) * 100).toFixed(2) : 0;

  if (contribution <= 0) {
    return {
      reachable: false,
      contributionMarginPerUnitIdr: contribution,
      contributionMarginRatioPct: cmRatio,
      breakEvenUnits: null,
      breakEvenRevenueIdr: null,
      marginOfSafetyUnits: null,
      warning: 'Break-even unreachable: selling price must exceed variable cost per unit.',
    };
  }

  const breakEvenUnits = fixed === 0 ? 0 : Math.ceil(fixed / contribution);
  const breakEvenRevenueIdr = breakEvenUnits * price;
  const marginOfSafetyUnits =
    typeof input.projectedMonthlyUnits === 'number' && Number.isFinite(input.projectedMonthlyUnits)
      ? Math.round(input.projectedMonthlyUnits) - breakEvenUnits
      : null;

  return {
    reachable: true,
    contributionMarginPerUnitIdr: contribution,
    contributionMarginRatioPct: cmRatio,
    breakEvenUnits,
    breakEvenRevenueIdr,
    marginOfSafetyUnits,
  };
}

export interface CashFlowMonthInput {
  monthLabel: string;
  cashInflowsIdr: number;
  cashOutflowsIdr: number;
}

export interface CashFlowMonthResult extends CashFlowMonthInput {
  openingBalanceIdr: number;
  netCashFlowIdr: number;
  closingBalanceIdr: number;
}

export interface CashFlowSummary {
  startingCashIdr: number;
  endingCashIdr: number;
  totalInflowsIdr: number;
  totalOutflowsIdr: number;
  netChangeIdr: number;
  lowestBalanceIdr: number;
  negativeCashMonths: string[];
  months: CashFlowMonthResult[];
}

export function calculateCashFlowProjection(
  startingCashIdr: number,
  monthlyEntries: CashFlowMonthInput[]
): CashFlowSummary {
  let running = Math.round(Number(startingCashIdr) || 0);
  let totalInflowsIdr = 0;
  let totalOutflowsIdr = 0;
  let lowestBalanceIdr = running;
  const negativeCashMonths: string[] = [];
  const months: CashFlowMonthResult[] = [];

  for (const entry of monthlyEntries) {
    const inflows = Math.max(0, Math.round(Number(entry.cashInflowsIdr) || 0));
    const outflows = Math.max(0, Math.round(Number(entry.cashOutflowsIdr) || 0));
    const openingBalanceIdr = running;
    const netCashFlowIdr = inflows - outflows;
    const closingBalanceIdr = openingBalanceIdr + netCashFlowIdr;

    totalInflowsIdr += inflows;
    totalOutflowsIdr += outflows;
    if (closingBalanceIdr < lowestBalanceIdr) lowestBalanceIdr = closingBalanceIdr;
    if (closingBalanceIdr < 0) negativeCashMonths.push(entry.monthLabel);

    months.push({
      monthLabel: entry.monthLabel,
      cashInflowsIdr: inflows,
      cashOutflowsIdr: outflows,
      openingBalanceIdr,
      netCashFlowIdr,
      closingBalanceIdr,
    });
    running = closingBalanceIdr;
  }

  return {
    startingCashIdr: Math.round(Number(startingCashIdr) || 0),
    endingCashIdr: running,
    totalInflowsIdr,
    totalOutflowsIdr,
    netChangeIdr: totalInflowsIdr - totalOutflowsIdr,
    lowestBalanceIdr,
    negativeCashMonths,
    months,
  };
}
