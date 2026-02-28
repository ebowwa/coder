/**
 * Simple Trading Example
 * Demonstrates stock tickers, prices, and percentage calculations
 */

interface Stock {
  ticker: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
}

interface Portfolio {
  stocks: Map<string, number>;
  totalValue: number;
}

/**
 * Calculate change and percentage from price and previous close
 */
function calculateChange(price: number, previousClose: number): { change: number; changePercent: number } {
  const change = price - previousClose;
  const changePercent = (change / previousClose) * 100;
  return { change, changePercent };
}

/**
 * Format price with 2 decimal places
 */
function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Format percentage with sign
 */
function formatPercentage(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * Format stock display line
 */
function formatStockLine(stock: Stock): string {
  const arrow = stock.changePercent >= 0 ? '▲' : '▼';
  const color = stock.changePercent >= 0 ? '🟢' : '🔴';
  return `${stock.ticker.padEnd(6)} | ${formatPrice(stock.price).padEnd(10)} | ${formatPercentage(stock.changePercent).padEnd(10)} ${arrow} ${color} | Vol: ${stock.volume.toLocaleString()}`;
}

/**
 * Sample stock data
 */
const stockMarket: Stock[] = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    price: 178.52,
    previousClose: 175.30,
    ...calculateChange(178.52, 175.30),
    volume: 52_340_000
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 141.80,
    previousClose: 138.25,
    ...calculateChange(141.80, 138.25),
    volume: 28_150_000
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corp.',
    price: 378.91,
    previousClose: 382.45,
    ...calculateChange(378.91, 382.45),
    volume: 21_890_000
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc.',
    price: 248.30,
    previousClose: 254.12,
    ...calculateChange(248.30, 254.12),
    volume: 98_760_000
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corp.',
    price: 875.35,
    previousClose: 860.20,
    ...calculateChange(875.35, 860.20),
    volume: 45_230_000
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    price: 178.25,
    previousClose: 176.80,
    ...calculateChange(178.25, 176.80),
    volume: 34_560_000
  }
];

/**
 * Display stock market summary
 */
function displayMarket(): void {
  console.log('\n' + '='.repeat(80));
  console.log('STOCK MARKET SUMMARY');
  console.log('='.repeat(80));
  console.log(`TICKER | PRICE      | CHANGE     | VOLUME`);
  console.log('-'.repeat(80));
  
  stockMarket.forEach(stock => {
    console.log(formatStockLine(stock));
  });
  
  // Calculate market stats
  const gainers = stockMarket.filter(s => s.changePercent > 0);
  const losers = stockMarket.filter(s => s.changePercent < 0);
  const avgChange = stockMarket.reduce((sum, s) => sum + s.changePercent, 0) / stockMarket.length;
  
  console.log('-'.repeat(80));
  console.log(`Market Summary: ${gainers.length} gainers, ${losers.length} losers | Avg change: ${formatPercentage(avgChange)}`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Sample portfolio
 */
const myPortfolio: Portfolio = {
  stocks: new Map([
    ['AAPL', 100],
    ['NVDA', 25],
    ['TSLA', 50],
    ['MSFT', 30]
  ]),
  totalValue: 0
};

/**
 * Calculate portfolio value
 */
function calculatePortfolioValue(portfolio: Portfolio, market: Stock[]): number {
  let total = 0;
  
  for (const [ticker, shares] of portfolio.stocks) {
    const stock = market.find(s => s.ticker === ticker);
    if (stock) {
      total += stock.price * shares;
    }
  }
  
  portfolio.totalValue = total;
  return total;
}

/**
 * Display portfolio
 */
function displayPortfolio(portfolio: Portfolio, market: Stock[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('MY PORTFOLIO');
  console.log('='.repeat(80));
  console.log(`TICKER | SHARES      | PRICE      | VALUE       | P/L (%)`);
  console.log('-'.repeat(80));
  
  for (const [ticker, shares] of portfolio.stocks) {
    const stock = market.find(s => s.ticker === ticker);
    if (stock) {
      const value = stock.price * shares;
      const arrow = stock.changePercent >= 0 ? '▲' : '▼';
      console.log(
        `${ticker.padEnd(7)} | ${(shares.toString()).padEnd(11)} | ` +
        `${formatPrice(stock.price).padEnd(10)} | ` +
        `${formatPrice(value).padEnd(10)} | ` +
        `${formatPercentage(stock.changePercent).padEnd(9)} ${arrow}`
      );
    }
  }
  
  const totalValue = calculatePortfolioValue(portfolio, market);
  console.log('-'.repeat(80));
  console.log(`TOTAL PORTFOLIO VALUE: ${formatPrice(totalValue)}`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Trading function - buy stock
 */
function buyStock(portfolio: Portfolio, ticker: string, shares: number, market: Stock[]): void {
  const stock = market.find(s => s.ticker === ticker);
  
  if (!stock) {
    console.log(`Error: Stock ${ticker} not found`);
    return;
  }
  
  const currentShares = portfolio.stocks.get(ticker) || 0;
  portfolio.stocks.set(ticker, currentShares + shares);
  
  const cost = stock.price * shares;
  console.log(`✓ Bought ${shares} shares of ${ticker} at ${formatPrice(stock.price)} (Total: ${formatPrice(cost)})`);
}

/**
 * Trading function - sell stock
 */
function sellStock(portfolio: Portfolio, ticker: string, shares: number, market: Stock[]): void {
  const currentShares = portfolio.stocks.get(ticker) || 0;
  
  if (currentShares < shares) {
    console.log(`Error: Not enough shares of ${ticker} (have ${currentShares}, want to sell ${shares})`);
    return;
  }
  
  const stock = market.find(s => s.ticker === ticker);
  if (!stock) {
    console.log(`Error: Stock ${ticker} not found`);
    return;
  }
  
  const newShares = currentShares - shares;
  if (newShares === 0) {
    portfolio.stocks.delete(ticker);
  } else {
    portfolio.stocks.set(ticker, newShares);
  }
  
  const proceeds = stock.price * shares;
  console.log(`✓ Sold ${shares} shares of ${ticker} at ${formatPrice(stock.price)} (Total: ${formatPrice(proceeds)})`);
}

/**
 * Main execution
 */
function main(): void {
  // Display market
  displayMarket();
  
  // Display portfolio
  displayPortfolio(myPortfolio, stockMarket);
  
  // Trading examples
  console.log('\n' + '='.repeat(80));
  console.log('TRADING ACTIVITY');
  console.log('='.repeat(80));
  
  buyStock(myPortfolio, 'GOOGL', 50, stockMarket);
  buyStock(myPortfolio, 'AMZN', 75, stockMarket);
  sellStock(myPortfolio, 'TSLA', 25, stockMarket);
  
  console.log('='.repeat(80));
  
  // Display updated portfolio
  displayPortfolio(myPortfolio, stockMarket);
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { Stock, Portfolio, calculateChange, buyStock, sellStock, displayMarket, displayPortfolio };
