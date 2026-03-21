/**
 * Quant Types
 * Type definitions for financial/quantitative calculations
 * Used by prediction markets, AMMs, and risk analysis
 */

/** OHLCV candlestick data */
export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** AMM state for constant-product AMMs */
export interface AMMState {
  pool_yes: number;
  pool_no: number;
  k: number;
  fee: number;
  price_yes: number;
  price_no: number;
}

/** AMM cost calculation result */
export interface AMMCostResult {
  cost: number;
  avg_price: number;
}

/** AMM price impact result */
export interface AMMPriceImpactResult {
  price_before: number;
  price_after: number;
  price_impact: number;
  slippage: number;
}

/** LMSR price result */
export interface LMSRPriceResult {
  yes_price: number;
  no_price: number;
  spread: number;
}

/** Arbitrage detection result */
export interface ArbitrageResult {
  has_arbitrage: boolean;
  yes_price: number;
  no_price: number;
  total: number;
  profit_per_share: number;
}

/** Odds conversion result */
export interface OddsConversion {
  probability: number;
  decimal_odds: number;
  american_odds: number;
}

/** Value at Risk result */
export interface VaRResult {
  var: number;
  cvar: number;
  confidence_level: number;
}

/** Drawdown analysis result */
export interface DrawdownResult {
  max_drawdown: number;
  max_duration: number;
  current_drawdown: number;
  recovery_factor: number;
}

/** Sharpe ratio result */
export interface SharpeResult {
  sharpe_ratio: number;
  annualized_sharpe: number;
  risk_free_rate: number;
  avg_return: number;
}
