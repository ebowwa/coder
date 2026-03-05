/**
 * Streaming text highlighter for code blocks and diffs
 * Buffers text and highlights as content completes during streaming output
 */

import { highlight_code, highlight_diff } from "../native/index.js";

// ANSI color codes - Base16 Ocean color scheme
const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  strikethrough: "\x1b[9m",
  // Syntax colors
  purple: "\x1b[38;2;180;142;173m",    // keywords
  blue: "\x1b[38;2;143;161;179m",       // functions
  green: "\x1b[38;2;163;190;140m",      // strings, additions
  orange: "\x1b[38;2;208;135;112m",     // numbers
  red: "\x1b[38;2;191;97;106m",         // types, deletions
  cyan: "\x1b[38;2;150;181;180m",       // builtins
  gray: "\x1b[38;2;192;197;206m",       // default
  yellow: "\x1b[38;2;235;203;139m",     // warnings, highlights
  comment: "\x1b[38;2;101;115;126m",    // comments
  // Markdown specific
  header: "\x1b[38;2;143;161;179m\x1b[1m",  // bold blue
  link: "\x1b[38;2;150;181;180m\x1b[4m",    // cyan underline
  list: "\x1b[38;2;180;142;173m",           // purple bullet
  blockquote: "\x1b[38;2;101;115;126m\x1b[3m", // dim italic gray
  hr: "\x1b[38;2;101;115;126m",             // dim gray
  tableBorder: "\x1b[38;2;143;161;179m",    // blue for table borders
  tableHeader: "\x1b[38;2;180;142;173m\x1b[1m", // bold purple for table headers
  // Financial/Trading colors
  money: "\x1b[38;2;163;190;140m",          // green for money amounts
  moneyLoss: "\x1b[38;2;191;97;106m",       // red for losses
  moneyGain: "\x1b[38;2;140;190;140m\x1b[1m", // bold green for gains
  percentUp: "\x1b[38;2;163;190;140m",      // green for positive %
  percentDown: "\x1b[38;2;191;97;106m",     // red for negative %
  ticker: "\x1b[38;2;235;203;139m\x1b[1m",  // bold yellow for stock tickers
  crypto: "\x1b[38;2;247;140;108m",         // orange for crypto
  timestamp: "\x1b[38;2;101;115;126m",      // dim gray for timestamps
  math: "\x1b[38;2;180;142;173m",           // purple for math operators
  bullish: "\x1b[38;2;163;190;140m\x1b[1m", // bold green for bullish terms
  bearish: "\x1b[38;2;191;97;106m\x1b[1m",  // bold red for bearish terms
  neutral: "\x1b[38;2;235;203;139m",        // yellow for neutral terms
  priceTarget: "\x1b[38;2;143;161;179m\x1b[4m", // blue underline for price targets
};

// Currency symbols and their names
const CURRENCY_SYMBOLS: Record<string, string> = {
  '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR',
  '₽': 'RUB', '₩': 'KRW', '₿': 'BTC', 'Ξ': 'ETH', '₮': 'USDT',
  '₳': 'ADA', '₴': 'UAH', '₸': 'KZT', '₺': 'TRY', '₼': 'AZN',
  '₪': 'ILS', '₫': 'VND', '₭': 'LAK', '₱': 'PHP', '₲': 'PYG',
  '₵': 'GHS', '₡': 'CRC', '₦': 'NGN', '₣': 'CHF', '₤': 'TRY',
};

// Crypto symbols
const CRYPTO_SYMBOLS = new Set([
  'BTC', 'ETH', 'USDT', 'BNB', 'XRP', 'SOL', 'USDC', 'ADA', 'DOGE', 'DOT',
  'MATIC', 'LTC', 'SHIB', 'TRX', 'AVAX', 'LINK', 'ATOM', 'UNI', 'XMR', 'ETC',
  'XLM', 'BCH', 'APT', 'NEAR', 'FIL', 'LDO', 'ARB', 'OP', 'HBAR', 'VET',
  'ICP', 'QNT', 'AAVE', 'GRT', 'ALGO', 'SAND', 'MANA', 'AXS', 'FTM', 'EGLD',
  'SUSHI', 'THETA', 'XTZ', 'EOS', 'FLOW', 'CHZ', 'SNX', 'LUNC', 'RUNE', 'KAVA',
  'CRV', 'COMP', 'YFI', 'MKR', 'ZEC', 'DASH', 'NEO', 'WAVES', 'ENJ', 'BAT',
  '1INCH', 'ANKR', 'CELO', 'CVC', 'DIA', 'GNO', 'KNC', 'OCEAN', 'OMG', 'REN',
  'RLC', 'STORJ', 'SYN', 'UMA', 'ZRX', 'BLUR', 'DYDX', 'GMX', 'PEPE', 'BONK',
  'WIF', 'FLOKI', 'INJ', 'SUI', 'SEI', 'TIA', 'IMX', 'ORDI', 'JUP', 'W',
]);

// Stock ticker pattern (1-5 uppercase letters)
const TICKER_PATTERN = /\$?([A-Z]{1,5})(?=\s|\.|,|:|;|!|\?|$|\(|\)|\[|\]|-)/g;

// Trading terms
const BULLISH_TERMS = new Set([
  'bull', 'bullish', 'long', 'buy', 'call', 'pump', 'moon', 'rocket', 'lambo',
  'hold', 'hodl', 'diamond', 'hands', 'gains', 'profit', 'rally', 'surge',
  'breakout', 'uptrend', 'accumulation', 'support', 'bounce', 'recovery',
  'all-time high', 'ath', 'bagholder', 'whale buy', 'accumulation', 'undervalued',
]);

const BEARISH_TERMS = new Set([
  'bear', 'bearish', 'short', 'sell', 'put', 'dump', 'crash', 'dump', 'rekt',
  'liquidated', 'loss', 'bleed', 'downtrend', 'breakdown', 'resistance',
  'correction', 'dip', ' capitulation', 'panic sell', 'overvalued', 'bubble',
]);

const NEUTRAL_TERMS = new Set([
  'position', 'entry', 'exit', 'stop', 'limit', 'market', 'order', 'trade',
  'volume', 'liquidity', 'spread', 'slippage', 'leverage', 'margin', 'futures',
  'options', 'perpetual', 'funding', 'basis', 'arbitrage', 'hedge', 'delta',
  'gamma', 'theta', 'vega', 'iv', 'hv', 'volatility', 'oi', 'open interest',
]);

// Math operators and symbols
const MATH_PATTERNS = [
  { pattern: /[+\-×÷*\/%^=<>≤≥≠≈±√∫∑∏∂∆∇]/g, color: 'math' },
  { pattern: /\b(pi|π|e|phi|inf|infinity|NaN|null)\b/gi, color: 'orange' },
];

/**
 * Detects if content looks like a diff (unified diff format)
 */
function isDiffContent(content: string): boolean {
  const lines = content.split('\n').filter(l => l.length > 0);
  if (lines.length < 3) return false;

  // Check for diff markers
  let diffMarkers = 0;
  for (const line of lines.slice(0, 10)) {
    if (line.startsWith('+++') || line.startsWith('---') ||
        line.startsWith('@@') || line.startsWith('diff ') ||
        line.startsWith('index ')) {
      diffMarkers++;
    }
  }

  // Also check for +/- lines
  let plusLines = 0;
  let minusLines = 0;
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) plusLines++;
    if (line.startsWith('-') && !line.startsWith('---')) minusLines++;
  }

  return diffMarkers >= 2 || (plusLines > 0 && minusLines > 0);
}

/**
 * Highlight diff content with ANSI colors
 * Supports unified diff, git diff, and context diff formats
 */
function highlightDiffContent(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Hunk header - cyan with function context
      // Format: @@ -start,count +start,count @@ optional_function_name
      const match = line.match(/^(@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@)(.*)$/);
      if (match) {
        result.push(`${COLORS.cyan}${match[1]}${COLORS.reset}${COLORS.dim}${match[2]}${COLORS.reset}`);
      } else {
        result.push(`${COLORS.cyan}${line}${COLORS.reset}`);
      }
    } else if (line.startsWith('+++') || line.startsWith('---')) {
      // File headers - bold
      const prefix = line.startsWith('+++') ? '+' : '-';
      const rest = line.slice(3);
      result.push(`${COLORS.bold}${prefix}${prefix}${prefix}${COLORS.reset}${COLORS.cyan}${rest}${COLORS.reset}`);
    } else if (line.startsWith('diff --git')) {
      // Git diff header
      result.push(`${COLORS.dim}${line}${COLORS.reset}`);
    } else if (line.startsWith('index ')) {
      // Index line
      result.push(`${COLORS.dim}${line}${COLORS.reset}`);
    } else if (line.startsWith('new file') || line.startsWith('deleted file')) {
      // New/deleted file markers
      result.push(`${COLORS.yellow}${line}${COLORS.reset}`);
    } else if (line.startsWith('Binary files')) {
      // Binary file markers
      result.push(`${COLORS.yellow}${line}${COLORS.reset}`);
    } else if (line.startsWith('rename from') || line.startsWith('rename to')) {
      // Rename markers
      result.push(`${COLORS.purple}${line}${COLORS.reset}`);
    } else if (line.startsWith('similarity index')) {
      // Similarity index
      result.push(`${COLORS.dim}${line}${COLORS.reset}`);
    } else if (line.startsWith('+')) {
      // Additions - green with brighter first char
      if (line === '+') {
        result.push(`${COLORS.green}+${COLORS.reset}`);
      } else {
        result.push(`${COLORS.green}+${line.slice(1)}${COLORS.reset}`);
      }
    } else if (line.startsWith('-')) {
      // Deletions - red
      if (line === '-') {
        result.push(`${COLORS.red}-${COLORS.reset}`);
      } else {
        result.push(`${COLORS.red}-${line.slice(1)}${COLORS.reset}`);
      }
    } else if (line.startsWith(' ') || line === '') {
      // Context lines - dim
      result.push(`${COLORS.dim}${line}${COLORS.reset}`);
    } else if (line.match(/^(={67}|>{67}|<{67})/)) {
      // Context diff separators
      result.push(`${COLORS.dim}${line}${COLORS.reset}`);
    } else if (line.startsWith('***************')) {
      // Context diff hunk marker
      result.push(`${COLORS.cyan}${line}${COLORS.reset}`);
    } else if (line.startsWith('*** ') || line.startsWith('--- ')) {
      // Context diff file markers (at line start, not diff markers)
      result.push(`${COLORS.cyan}${line}${COLORS.reset}`);
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

/**
 * Highlight inline code with a subtle color
 */
function highlightInlineCode(text: string): string {
  // Skip if we're inside a code block
  if (text.includes('```')) {
    return text;
  }

  // Match inline code with single backticks
  // Also handle escaped backticks and nested code
  return text
    // Single backtick inline code
    .replace(/`([^`\n]+)`/g, (_, code) => {
      return `${COLORS.dim}\`${COLORS.orange}${code}${COLORS.dim}\`${COLORS.reset}`;
    })
    // Double backtick inline code (allows single backticks inside)
    .replace(/``([^`\n]+)``/g, (_, code) => {
      return `${COLORS.dim}\`\`${COLORS.orange}${code}${COLORS.dim}\`\`${COLORS.reset}`;
    });
}

/**
 * Highlight URLs that aren't already part of markdown links
 */
function highlightUrls(text: string): string {
  // Skip if already in a markdown link
  if (/\[[^\]]+\]\([^)]+\)/.test(text)) {
    return text;
  }

  // Match bare URLs (http:// or https://)
  return text.replace(
    /(https?:\/\/[^\s<>\[\]()]+)/g,
    `${COLORS.link}$1${COLORS.reset}`
  );
}

/**
 * Highlight emoji shortcodes :emoji:
 */
function highlightEmoji(text: string): string {
  return text.replace(/:([a-z0-9_+-]+):/g, (_, name) => {
    return `${COLORS.yellow}:${name}:${COLORS.reset}`;
  });
}

// ===== Financial/Trading Highlighting =====

/**
 * Format large numbers with K, M, B, T suffixes
 */
function formatLargeNumber(num: number): string {
  if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Highlight currency amounts ($100, €50, ¥1000, etc.)
 */
function highlightCurrency(text: string): string {
  // Skip if inside code block or has ANSI codes
  if (text.includes('```') || text.includes('\x1b[')) return text;

  // Currency symbols pattern - match currency symbol followed by number
  const currencyPattern = new RegExp(
    `([${Object.keys(CURRENCY_SYMBOLS).join('')}])\\s?([\\d,]+(?:\\.\\d{1,8})?)`,
    'g'
  );

  let result = text.replace(currencyPattern, (_, symbol, amount) => {
    const currency = CURRENCY_SYMBOLS[symbol] || '';
    return `${COLORS.money}${symbol}${amount}${COLORS.reset}`;
  });

  // Named currency formats (USD 100, EUR 50)
  result = result.replace(
    /\b(USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY|INR|MXN|BRL|KRW|SGD|HKD|NOK|SEK|DKK|NZD|ZAR|RUB|TRY|PLN|THB|IDR|MYR|PHP|VND)\s+([\d,]+(?:\.\d{1,8})?)/gi,
    (_, currency, amount) => `${COLORS.money}${currency} ${amount}${COLORS.reset}`
  );

  return result;
}

/**
 * Highlight cryptocurrency amounts and symbols
 */
function highlightCrypto(text: string): string {
  // Skip if inside code block
  if (text.includes('```')) return text;

  let result = text;

  // Crypto amounts with symbol (0.5 BTC, 10 ETH, etc.)
  const cryptoPattern = new RegExp(
    `([\\d,]+(?:\\.\\d{1,8})?)\\s*(${Array.from(CRYPTO_SYMBOLS).join('|')})(?=\\s|\\.|\,|:|;|!|\\?|$)`,
    'gi'
  );

  result = result.replace(cryptoPattern, (_, amount, symbol) => {
    const upperSymbol = symbol.toUpperCase();
    return `${COLORS.crypto}${amount} ${upperSymbol}${COLORS.reset}`;
  });

  // Satoshi amounts
  result = result.replace(
    /([\d,]+(?:\.\d{1,8})?)\s*(sats?|satoshis?)(?=\s|\.|,|:|;|!|\?|$)/gi,
    (_, amount, unit) => {
      return `${COLORS.crypto}${amount} ${unit.toLowerCase()}${COLORS.reset}`;
    }
  );

  // Gwei amounts (gas prices)
  result = result.replace(
    /([\d,]+(?:\.\d{1,2})?)\s*gwei(?=\s|\.|,|:|;|!|\?|$)/gi,
    (_, amount) => {
      return `${COLORS.crypto}${amount} gwei${COLORS.reset}`;
    }
  );

  // Wei amounts
  result = result.replace(
    /([\d,]+)\s*wei(?=\s|\.|,|:|;|!|\?|$)/gi,
    (_, amount) => {
      return `${COLORS.dim}${amount} wei${COLORS.reset}`;
    }
  );

  return result;
}

/**
 * Highlight percentages with color based on positive/negative
 */
function highlightPercentages(text: string): string {
  // Skip if inside code block or already has ANSI codes
  if (text.includes('```') || text.includes('\x1b[')) return text;

  let result = text;

  // Positive percentages (+5.2%, +10%) - must have space or start before
  result = result.replace(
    /(^|\s)\+([\d,]+(?:\.\d{1,4})?)\s*%/gm,
    (_, prefix, num) => `${prefix}${COLORS.percentUp}+${num}%${COLORS.reset}`
  );

  // Negative percentages (-5.2%, -10%) - must have space or start before
  result = result.replace(
    /(^|\s)-([\d,]+(?:\.\d{1,4})?)\s*%/gm,
    (_, prefix, num) => `${prefix}${COLORS.percentDown}-${num}%${COLORS.reset}`
  );

  // Neutral percentages (5.2%, 10%) - must not be part of +/-
  result = result.replace(
    /(^|\s)([\d,]+(?:\.\d{1,4})?)\s*%/gm,
    (_, prefix, num) => `${prefix}${COLORS.orange}${num}%${COLORS.reset}`
  );

  return result;
}

/**
 * Highlight stock tickers ($AAPL, $TSLA, etc.)
 */
function highlightTickers(text: string): string {
  // Skip if inside code block or already has ANSI codes
  if (text.includes('```') || text.includes('\x1b[')) return text;

  // Match $TICKER with word boundaries - must have $ prefix and be 1-5 uppercase letters
  return text.replace(
    /(?<![a-zA-Z0-9])\$([A-Z]{1,5})(?![a-zA-Z0-9])/g,
    (_, ticker) => `${COLORS.ticker}$${ticker}${COLORS.reset}`
  );
}

/**
 * Highlight trading terms (bullish/bearish/neutral)
 */
function highlightTradingTerms(text: string): string {
  // Skip if inside code block or already has ANSI codes
  if (text.includes('```') || text.includes('\x1b[')) return text;

  let result = text;

  // Bullish terms - whole word matches only
  const bullishRegex = new RegExp(
    `\\b(${Array.from(BULLISH_TERMS).join('|')})\\b`,
    'gi'
  );
  result = result.replace(bullishRegex, (match) => {
    return `${COLORS.bullish}${match}${COLORS.reset}`;
  });

  // Bearish terms - whole word matches only
  const bearishRegex = new RegExp(
    `\\b(${Array.from(BEARISH_TERMS).join('|')})\\b`,
    'gi'
  );
  result = result.replace(bearishRegex, (match) => {
    return `${COLORS.bearish}${match}${COLORS.reset}`;
  });

  return result;
}

/**
 * Highlight price targets and ranges
 */
function highlightPriceTargets(text: string): string {
  // Skip if inside code block
  if (text.includes('```')) return text;

  let result = text;

  // Price targets ($100 target, PT: $150, etc.)
  result = result.replace(
    /\b(?:PT|price target|target|TP|take profit)\s*:?\s*([\$€£¥]?\s*[\d,]+(?:\.\d{1,4})?)/gi,
    (_, price) => `${COLORS.priceTarget}PT: ${price}${COLORS.reset}`
  );

  // Stop loss levels
  result = result.replace(
    /\b(?:SL|stop loss|stop)\s*:?\s*([\$€£¥]?\s*[\d,]+(?:\.\d{1,4})?)/gi,
    (_, price) => `${COLORS.red}SL: ${price}${COLORS.reset}`
  );

  // Entry levels
  result = result.replace(
    /\b(?:entry|enter|buy in)\s*:?\s*([\$€£¥]?\s*[\d,]+(?:\.\d{1,4})?)/gi,
    (_, price) => `${COLORS.green}Entry: ${price}${COLORS.reset}`
  );

  // Price ranges ($100-$150, 50-75)
  result = result.replace(
    /([\$€£¥]?\s*[\d,]+(?:\.\d{1,4})?)\s*[-–]\s*([\$€£¥]?\s*[\d,]+(?:\.\d{1,4})?)/g,
    (_, low, high) => `${COLORS.money}${low}-${high}${COLORS.reset}`
  );

  return result;
}

/**
 * Highlight timestamps and dates
 */
function highlightTimestamps(text: string): string {
  // Skip if inside code block or already has ANSI codes
  if (text.includes('```') || text.includes('\x1b[')) return text;

  let result = text;

  // ISO dates (2024-01-15) - specific pattern
  result = result.replace(
    /\b(\d{4}-\d{2}-\d{2})\b/g,
    (_, date) => `${COLORS.timestamp}${date}${COLORS.reset}`
  );

  // ISO datetime with T (2024-01-15T14:30:00Z)
  result = result.replace(
    /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(Z)?\b/g,
    (_, datetime, z) => `${COLORS.timestamp}${datetime}${z || ''}${COLORS.reset}`
  );

  // Time only (14:30:00) - must have word boundary
  result = result.replace(
    /\b(\d{2}:\d{2}:\d{2})\b/g,
    (_, time) => `${COLORS.timestamp}${time}${COLORS.reset}`
  );

  // Relative times (1h ago, 2d ago, etc.)
  result = result.replace(
    /\b(\d+)\s*(second|minute|hour|day|week|month|year)s?\s+ago\b/gi,
    (_, num, unit) => `${COLORS.timestamp}${num} ${unit}s ago${COLORS.reset}`
  );

  return result;
}

/**
 * Highlight mathematical expressions
 */
function highlightMath(text: string): string {
  // Skip if inside code block or has ANSI codes
  if (text.includes('```') || text.includes('\x1b[')) return text;

  let result = text;

  // Mathematical constants - be specific with word boundaries
  result = result.replace(
    /\b(pi|π|euler|infinity|inf)\b/gi,
    (_, constant) => `${COLORS.orange}${constant}${COLORS.reset}`
  );

  // Exponents (x^2, 10^6) - only in math contexts
  result = result.replace(
    /(\d)\^(\d+)/g,
    (_, base, exp) => `${COLORS.math}${base}^${exp}${COLORS.reset}`
  );

  // Scientific notation (1.5e10, 2E-5)
  result = result.replace(
    /(\d+\.\d+)[eE]([+-]?\d+)/g,
    (_, mantissa, exp) => `${COLORS.orange}${mantissa}e${exp}${COLORS.reset}`
  );

  return result;
}

/**
 * Highlight P/L (profit/loss) statements
 */
function highlightPL(text: string): string {
  // Skip if inside code block
  if (text.includes('```')) return text;

  let result = text;

  // P/L with amounts
  result = result.replace(
    /\b(?:P\/L|PnL|profit\/loss|PL)\s*:?\s*([+\-]?[\$€£¥]?\s*[\d,]+(?:\.\d{1,4})?)/gi,
    (_, amount) => {
      const isPositive = !amount.startsWith('-');
      const color = isPositive ? COLORS.moneyGain : COLORS.moneyLoss;
      return `${color}P/L: ${amount}${COLORS.reset}`;
    }
  );

  // ROI percentages
  result = result.replace(
    /\b(?:ROI|return)\s*:?\s*([+\-]?[\d,]+(?:\.\d{1,2})?\s*%)/gi,
    (_, percent) => {
      const isPositive = !percent.startsWith('-');
      const color = isPositive ? COLORS.percentUp : COLORS.percentDown;
      return `${color}ROI: ${percent}${COLORS.reset}`;
    }
  );

  // Unrealized/Realized P/L
  result = result.replace(
    /\b(unrealized|realized)\s+(p\/l|pnl|profit|loss)\s*:?\s*([+\-]?[\$€£¥]?\s*[\d,]+(?:\.\d{1,4})?)/gi,
    (_, status, _type, amount) => {
      const isPositive = !amount.startsWith('-');
      const color = isPositive ? COLORS.moneyGain : COLORS.moneyLoss;
      return `${color}${status} P/L: ${amount}${COLORS.reset}`;
    }
  );

  return result;
}

/**
 * Highlight OHLC (Open, High, Low, Close) values
 */
function highlightOHLC(text: string): string {
  // Skip if inside code block
  if (text.includes('```')) return text;

  let result = text;

  // OHLC pattern
  result = result.replace(
    /\b(?:O|Open)\s*:?\s*([\d,]+(?:\.\d{1,8})?)/gi,
    (_, val) => `${COLORS.neutral}O: ${val}${COLORS.reset}`
  );
  result = result.replace(
    /\b(?:H|High)\s*:?\s*([\d,]+(?:\.\d{1,8})?)/gi,
    (_, val) => `${COLORS.moneyGain}H: ${val}${COLORS.reset}`
  );
  result = result.replace(
    /\b(?:L|Low)\s*:?\s*([\d,]+(?:\.\d{1,8})?)/gi,
    (_, val) => `${COLORS.moneyLoss}L: ${val}${COLORS.reset}`
  );
  result = result.replace(
    /\b(?:C|Close)\s*:?\s*([\d,]+(?:\.\d{1,8})?)/gi,
    (_, val) => `${COLORS.neutral}C: ${val}${COLORS.reset}`
  );

  // Volume
  result = result.replace(
    /\b(?:V|Vol|Volume)\s*:?\s*([\d,]+(?:\.\d{1,2})?[KkMmBb]?)/gi,
    (_, val) => `${COLORS.cyan}Vol: ${val}${COLORS.reset}`
  );

  // Market Cap
  result = result.replace(
    /\b(?:MCap|Market Cap|Market Capitalization)\s*:?\s*([\$€£¥]?\s*[\d,]+(?:\.\d{1,2})?[KkMmBbTt]?)/gi,
    (_, val) => `${COLORS.money}MCap: ${val}${COLORS.reset}`
  );

  return result;
}

/**
 * Apply all financial highlighting - runs FIRST before any other highlighting
 */
function highlightFinancial(text: string): string {
  // Skip if already has ANSI codes or inside code block
  if (text.includes('\x1b[') || text.includes('```')) return text;

  let result = text;

  // Order matters - most specific patterns first
  // 1. Crypto (specific symbols)
  result = highlightCrypto(result);
  // 2. Currency (specific symbols)
  result = highlightCurrency(result);
  // 3. Percentages (with +/-)
  result = highlightPercentages(result);
  // 4. P/L statements
  result = highlightPL(result);
  // 5. Price targets (PT:, SL:)
  result = highlightPriceTargets(result);
  // 6. OHLC values
  result = highlightOHLC(result);
  // 7. Stock tickers ($AAPL)
  result = highlightTickers(result);
  // 8. Trading terms (bullish/bearish)
  result = highlightTradingTerms(result);
  // 9. Timestamps
  result = highlightTimestamps(result);
  // 10. Math expressions
  result = highlightMath(result);

  return result;
}

/**
 * Highlight markdown formatting in plain text
 */
function highlightMarkdown(text: string): string {
  let result = text;

  // Skip processing if we're inside a code block (basic check)
  if (text.includes('```')) {
    return result;
  }

  // Horizontal rules (---, ***, ___) - must be on own line
  result = result.replace(/^( {0,3})([-*_])( {0,2}\2){2,}$/gm,
    `${COLORS.hr}$1$2$2$2${COLORS.reset}`);

  // Headers (# ## ### etc) - with setext style support
  result = result.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, content) => {
    // Color the header level differently based on depth
    const level = hashes.length;
    if (level === 1) {
      return `${COLORS.bold}${COLORS.blue}${hashes} ${content}${COLORS.reset}`;
    } else if (level === 2) {
      return `${COLORS.bold}${COLORS.cyan}${hashes} ${content}${COLORS.reset}`;
    }
    return `${COLORS.header}${hashes} ${content}${COLORS.reset}`;
  });

  // Setext-style headers (underlined with === or ---)
  result = result.replace(/^(.+)\n([=]+)$/gm, (_, content, line) => {
    return `${COLORS.bold}${COLORS.blue}${content}${COLORS.reset}\n${COLORS.hr}${line}${COLORS.reset}`;
  });
  result = result.replace(/^(.+)\n([-]+)$/gm, (_, content, line) => {
    return `${COLORS.bold}${COLORS.cyan}${content}${COLORS.reset}\n${COLORS.hr}${line}${COLORS.reset}`;
  });

  // Blockquotes (> at start of line)
  result = result.replace(/^(>{1,})\s?(.*)$/gm, (_, markers, content) => {
    const depth = markers.length;
    // Different color for nested quotes
    const color = depth > 1 ? COLORS.dim : COLORS.blockquote;
    return `${COLORS.green}${markers}${COLORS.reset} ${color}${content}${COLORS.reset}`;
  });

  // Tables - simple detection and formatting
  result = result.replace(/^\|(.+)\|\s*$/gm, (match, content) => {
    // Table row
    const cells = content.split('|');
    const formattedCells = cells.map((cell: string) => {
      const trimmed = cell.trim();
      if (trimmed) {
        return ` ${COLORS.gray}${trimmed}${COLORS.reset} `;
      }
      return cell;
    }).join(`${COLORS.tableBorder}|${COLORS.reset}`);
    return `${COLORS.tableBorder}|${COLORS.reset}${formattedCells}${COLORS.tableBorder}|${COLORS.reset}`;
  });

  // Table separator line (|---|---|)
  result = result.replace(/^\|([-:\s|]+)\|\s*$/gm, (_, content) => {
    return `${COLORS.tableBorder}|${content}|${COLORS.reset}`;
  });

  // Bold (**text** or __text__)
  result = result.replace(/\*\*([^*]+)\*\*/g, `${COLORS.bold}$1${COLORS.reset}`);
  result = result.replace(/__([^_]+)__/g, `${COLORS.bold}$1${COLORS.reset}`);

  // Strikethrough (~~text~~)
  result = result.replace(/~~([^~]+)~~/g, `${COLORS.strikethrough}${COLORS.dim}$1${COLORS.reset}`);

  // Italic (*text* or _text_) - be careful not to match inside words
  result = result.replace(/(?<![a-zA-Z\*])\*([^*]+)\*(?![a-zA-Z\*])/g, `${COLORS.italic}$1${COLORS.reset}`);
  result = result.replace(/(?<![a-zA-Z_])_([^_]+)_(?![a-zA-Z_])/g, `${COLORS.italic}$1${COLORS.reset}`);

  // Bold+Italic (***text*** or ___text___)
  result = result.replace(/\*\*\*([^*]+)\*\*\*/g, `${COLORS.bold}${COLORS.italic}$1${COLORS.reset}`);
  result = result.replace(/___([^_]+)___/g, `${COLORS.bold}${COLORS.italic}$1${COLORS.reset}`);

  // Task lists (- [ ] or - [x])
  result = result.replace(/^(\s*)[-*]\s\[([ xX])\]/gm, (_, indent, checked) => {
    const mark = checked.toLowerCase() === 'x' ? '✓' : ' ';
    const color = checked.toLowerCase() === 'x' ? COLORS.green : COLORS.dim;
    return `${indent}${COLORS.list}-${COLORS.reset} ${color}[${mark}]${COLORS.reset}`;
  });

  // Regular list items (- or * at start of line)
  result = result.replace(/^(\s*)([-*])\s(?!\[)/gm, `$1${COLORS.list}$2${COLORS.reset} `);

  // Numbered lists
  result = result.replace(/^(\s*)(\d+\.)(?=\s)/gm, `$1${COLORS.list}$2${COLORS.reset}`);

  // Definition lists (term : definition)
  result = result.replace(/^([^:\n]+):\s{2,}(.+)$/gm,
    `${COLORS.bold}$1${COLORS.reset}:${COLORS.dim}  $2${COLORS.reset}`);

  // Links [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    `${COLORS.link}[$1]${COLORS.reset}${COLORS.dim}($2)${COLORS.reset}`);

  // Reference-style links [text][ref]
  result = result.replace(/\[([^\]]+)\]\[([^\]]*)\]/g,
    `${COLORS.link}[$1]${COLORS.reset}${COLORS.dim}[$2]${COLORS.reset}`);

  // Images ![alt](url)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
    `${COLORS.yellow}![${COLORS.reset}${COLORS.dim}$1${COLORS.reset}${COLORS.yellow}]${COLORS.reset}${COLORS.dim}($2)${COLORS.reset}`);

  // Footnotes [^1] and [^1]: definition
  result = result.replace(/\[\^([^\]]+)\]/g, `${COLORS.yellow}[^$1]${COLORS.reset}`);
  result = result.replace(/^\[\^([^\]]+)\]:\s*(.+)$/gm,
    `${COLORS.yellow}[^$1]${COLORS.reset}:${COLORS.dim} $2${COLORS.reset}`);

  // HTML tags (basic detection)
  result = result.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?>/g,
    `${COLORS.dim}<${COLORS.purple}$1${COLORS.reset}$2${COLORS.dim}>${COLORS.reset}`);

  // Highlight/mark (==text==)
  result = result.replace(/==([^=]+)==/g, `${COLORS.yellow}$1${COLORS.reset}`);

  // Keyboard shortcuts (<kbd>text</kbd> - if not already handled by HTML)
  result = result.replace(/<kbd>([^<]+)<\/kbd>/gi,
    `${COLORS.dim}[${COLORS.orange}$1${COLORS.dim}]${COLORS.reset}`);

  return result;
}

type BlockState = 'text' | 'code' | 'diff';

/**
 * Extract language and optional file path from fence info
 * Examples: "typescript", "typescript path/to/file.ts", "ts {linenos=true}"
 */
function parseFenceInfo(fenceInfo: string): { language: string; filePath?: string; attrs: string } {
  const parts = fenceInfo.split(/\s+/);
  const language = parts[0] || "";
  let filePath: string | undefined;
  let attrs = "";

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (part.includes('=')) {
      attrs += (attrs ? ' ' : '') + part;
    } else if (part.includes('.') || part.includes('/')) {
      // Looks like a file path
      filePath = part;
    }
  }

  return { language, filePath, attrs };
}

/**
 * Map file extensions to languages
 */
const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.ps1': 'powershell',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.md': 'markdown',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'css',
  '.less': 'css',
  '.sql': 'sql',
  '.xml': 'xml',
  '.svg': 'xml',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.dockerfile': 'dockerfile',
  '.makefile': 'makefile',
  '.cmake': 'cmake',
  '.lua': 'lua',
  '.r': 'r',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.erl': 'erlang',
  '.hs': 'haskell',
  '.ml': 'ocaml',
  '.clj': 'clojure',
  '.scala': 'scala',
  '.groovy': 'groovy',
  '.pl': 'perl',
  '.pm': 'perl',
};

/**
 * Detect language from file path
 */
function detectLanguageFromPath(filePath: string): string | undefined {
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'));
  return EXT_TO_LANG[ext];
}

/**
 * Apply all text highlighting (markdown, inline code, urls, emoji)
 */
function highlightAllText(text: string): string {
  // Skip if text already has ANSI codes (already processed)
  if (text.includes('\x1b[')) {
    return text;
  }

  let result = text;

  // Apply in order - more specific patterns should come first
  // Financial highlighting first since it has specific patterns
  result = highlightFinancial(result);
  // Then inline code (but skip if in code blocks)
  result = highlightInlineCode(result);
  // Markdown formatting
  result = highlightMarkdown(result);
  // URLs and emoji last
  result = highlightUrls(result);
  result = highlightEmoji(result);

  return result;
}

/**
 * Creates a streaming highlighter that detects and highlights code blocks
 * and diffs as they complete during streaming output.
 */
export function createStreamHighlighter(): {
  process: (text: string) => string;
  flush: () => string;
} {
  let buffer = "";
  let state: BlockState = 'text';
  let codeBlockLang = "";
  let blockContent = "";
  let blockFilePath = "";

  function process(text: string): string {
    buffer += text;
    let output = "";

    while (true) {
      if (state === 'code' || state === 'diff') {
        // Look for closing fence (``` at start of line)
        const closeMatch = buffer.match(/\n```/);
        if (!closeMatch) {
          // No closing fence yet, keep buffering
          // But output most of the buffer to avoid memory issues
          if (buffer.length > 2000) {
            const safeChunk = buffer.slice(0, -200); // Keep last 200 chars in case fence is partial
            blockContent += safeChunk;
            // For diffs, we can output as we go with line-by-line highlighting
            if (state === 'diff') {
              output += highlightDiffContent(safeChunk);
            } else {
              output += safeChunk; // Code gets highlighted at end for proper syntax
            }
            buffer = buffer.slice(-200);
          }
          break;
        }

        const closeIndex = closeMatch.index!;

        // Found closing fence - extract remaining content
        blockContent += buffer.slice(0, closeIndex);

        // Highlight based on block type
        let highlighted: string;
        const effectiveLang = codeBlockLang || (blockFilePath ? detectLanguageFromPath(blockFilePath) : '');

        if (state === 'diff' || (codeBlockLang === 'diff' || isDiffContent(blockContent))) {
          highlighted = highlightDiffContent(blockContent);
        } else if (effectiveLang) {
          try {
            highlighted = highlight_code(blockContent, effectiveLang).html;
          } catch {
            highlighted = blockContent;
          }
        } else {
          highlighted = blockContent;
        }

        // Remove trailing reset and whitespace from highlighted code
        const trimmed = highlighted
          .replace(/\x1b\[0m$/, '')
          .trimEnd();

        output += trimmed;
        output += `\n${COLORS.reset}\`\`\``;  // Newline, reset, and closing fence

        // Skip past the closing fence in buffer
        buffer = buffer.slice(closeIndex + 4); // +4 for "\n```"

        state = 'text';
        codeBlockLang = "";
        blockContent = "";
        blockFilePath = "";
      } else {
        // Look for opening fence: ``` followed by optional lang and newline
        // Support: ```typescript, ```typescript file.ts, ```{ .typescript }
        const openMatch = buffer.match(/```([^\n]*)\n/);
        if (!openMatch) {
          // No complete opening fence yet
          // Check if buffer might contain partial fence at end
          const partialFence = buffer.match(/```([^\n]*)$/);
          if (partialFence) {
            // Partial fence - output everything before it and keep fence in buffer
            const beforeFence = buffer.slice(0, buffer.length - partialFence[0].length);
            // Apply all text highlighting
            output += highlightAllText(beforeFence);
            buffer = partialFence[0];
            break;
          }

          // No fence at all - output everything with markdown highlighting
          // Keep last 4 chars in case of partial ``` (but try to keep complete lines)
          if (buffer.length > 4) {
            // Find the last newline to avoid splitting mid-line
            const lastNewline = buffer.lastIndexOf('\n', buffer.length - 4);
            let toOutput: string;
            if (lastNewline > 0 && buffer.length - lastNewline <= 10) {
              // If there's a recent newline, output up to it
              toOutput = buffer.slice(0, lastNewline + 1);
              buffer = buffer.slice(lastNewline + 1);
            } else if (buffer.length > 100) {
              // Long buffer with no newline - output all but last 4 chars
              toOutput = buffer.slice(0, -4);
              buffer = buffer.slice(-4);
            } else {
              // Short buffer - keep it all for now
              break;
            }
            output += highlightAllText(toOutput);
          }
          break;
        }

        // Found complete opening fence
        const fenceStart = openMatch.index!;
        const fenceInfo = openMatch[1] || "";
        const { language, filePath } = parseFenceInfo(fenceInfo);

        // Output text before the fence with markdown highlighting
        const beforeFence = buffer.slice(0, fenceStart);
        output += highlightAllText(beforeFence);

        // Output the opening fence line
        // Show with file path if available
        const detectedLang = language || (filePath ? detectLanguageFromPath(filePath) : '');
        if (filePath) {
          const langDisplay = language || detectedLang || '';
          output += `${COLORS.dim}\`\`\`${COLORS.cyan}${langDisplay}${COLORS.reset} ${COLORS.comment}${filePath}${COLORS.reset}\n`;
        } else if (language) {
          output += `${COLORS.dim}\`\`\`${COLORS.cyan}${language}${COLORS.reset}\n`;
        } else {
          output += `${COLORS.dim}\`\`\`${COLORS.reset}\n`;
        }

        // Skip past the opening fence in buffer
        buffer = buffer.slice(fenceStart + openMatch[0].length);

        // Determine block type
        if (language === 'diff' || language === 'patch') {
          state = 'diff';
        } else {
          state = 'code';
        }
        codeBlockLang = language;
        blockContent = "";
        blockFilePath = filePath || "";
      }
    }

    return output;
  }

  function flush(): string {
    let output = "";

    if (state === 'code' || state === 'diff') {
      // Unclosed code block - highlight what we have
      const effectiveLang = codeBlockLang || (blockFilePath ? detectLanguageFromPath(blockFilePath) : '');

      if (state === 'diff' || isDiffContent(blockContent)) {
        output += highlightDiffContent(blockContent);
      } else if (effectiveLang) {
        try {
          output += highlight_code(blockContent, effectiveLang).html;
        } catch {
          output += blockContent;
        }
      } else {
        output += blockContent;
      }
      output += COLORS.reset;
    }

    if (buffer) {
      output += highlightAllText(buffer);
      buffer = "";
    }

    return output;
  }

  return { process, flush };
}

/**
 * Highlight complete text with code blocks
 * Used for non-streaming contexts or final output
 */
export function highlightTextWithCodeBlocks(text: string): string {
  // Split by code blocks and highlight each
  // Support language + optional file path: ```typescript path/to/file.ts
  const codeBlockRegex = /```([^\n]*)\n([\s\S]*?)```/g;
  let result = "";
  let lastIndex = 0;

  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block with all highlighting
    const beforeText = text.slice(lastIndex, match.index);
    result += highlightAllText(beforeText);

    const fenceInfo = match[1] || "";
    const { language, filePath } = parseFenceInfo(fenceInfo);
    const code = match[2] || "";

    // Determine effective language
    const effectiveLang = language || (filePath ? detectLanguageFromPath(filePath) : '');

    // Show fence with file path if available
    if (filePath) {
      const langDisplay = language || effectiveLang || '';
      result += `${COLORS.dim}\`\`\`${COLORS.cyan}${langDisplay}${COLORS.reset} ${COLORS.comment}${filePath}${COLORS.reset}\n`;
    } else if (language) {
      result += `${COLORS.dim}\`\`\`${COLORS.cyan}${language}${COLORS.reset}\n`;
    } else {
      result += `${COLORS.dim}\`\`\`${COLORS.reset}\n`;
    }

    if (language === 'diff' || language === 'patch' || isDiffContent(code)) {
      // Highlight as diff
      result += highlightDiffContent(code);
      result += `\n${COLORS.reset}\`\`\``;
    } else if (effectiveLang) {
      // Highlight with language
      try {
        result += highlight_code(code, effectiveLang).html;
      } catch {
        result += code;
      }
      result += `\n${COLORS.reset}\`\`\``;
    } else {
      // No language, output as-is
      result += code;
      result += `\n${COLORS.reset}\`\`\``;
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text with all highlighting
  result += highlightAllText(text.slice(lastIndex));

  return result;
}
