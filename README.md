# Broker Asigurari

Aplicatie Next.js pentru comparare si achizitie asigurari online (RCA, Travel, Locuinta, PAD, Malpraxis), integrata cu API-ul InsureTech printr-un proxy server-side.

## Cerinte

- Node.js 20+
- npm 10+

## Configurare

1. Instaleaza dependentele:

```bash
npm install
```

2. Copiaza variabilele de mediu:

```bash
cp .env.example .env.local
```

3. Completeaza valorile reale pentru credentialele InsureTech in `.env.local`.

## Rulare

```bash
npm run dev
```

Aplicatia va porni pe `http://localhost:3000`.

## Comenzi utile

- `npm run dev` - server development
- `npm run build` - build productie
- `npm start` - porneste build-ul de productie
- `npm run lint` - verificare ESLint
- `npm test` - ruleaza testele (Vitest)
- `npm run test:watch` - ruleaza testele in watch mode

## Variabile de mediu

Vezi `.env.example` pentru lista completa. Fara aceste variabile, proxy-ul API nu porneste.

## Structura principala

- `src/app/` - pagini Next.js (fluxuri pe produs)
- `src/components/` - componente UI reutilizabile
- `src/lib/api/` - clienti API (browser/server)
- `src/lib/flows/` - utilitare de orchestrare pentru comenzi/oferte
- `src/lib/utils/` - validari si utilitare comune

## Portfolio monitoring automation

This repository also includes a Python decision-support portfolio monitor in `portfolio_monitor/`.
It generates stock portfolio action reports twice per US trading day, but it never executes trades.
Every report includes the required safety statement:

> This is decision-support analysis, not guaranteed financial advice. Final investment decisions are your responsibility.

### Files

- `portfolio.json` - current holdings and optional cost basis fields.
- `config.yaml` - JSON-compatible YAML config for risk rules, report times, symbols, and buy candidates.
- `portfolio_monitor/` - Python package for data fetching, analysis, report generation, notifications, and scheduling.
- `reports/` - generated Markdown reports.
- `logs/` - run logs.
- `tests/portfolio_monitor/` - unit tests for sizing and weight calculations.

### Environment variables

Copy `.env.example` and fill the portfolio-monitor values:

```bash
MARKET_DATA_API_KEY=optional-if-using-yahoo-fallback
NEWS_API_KEY=your-news-api-key
FRED_API_KEY=optional-fred-api-key
EMAIL_FROM=portfolio-monitor@example.com
EMAIL_TO=you@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=smtp-username
SMTP_PASSWORD=smtp-password
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
SLACK_WEBHOOK_URL=
```

The default market-data provider is Yahoo Finance fallback. If an API or feed is unavailable, the
report states that data is unavailable and avoids hallucinating unsupported news. If price data is
unavailable, trade dollar amounts are not generated.

### Run manually

```bash
python3 -m portfolio_monitor --config config.yaml run --slot now
python3 -m portfolio_monitor --config config.yaml run --slot morning --send
python3 -m portfolio_monitor --config config.yaml run --slot afternoon --send
```

Use `--force` only for testing outside a US trading day. Without `--force`, the monitor skips
weekends and US market holidays.

### Cron schedule

The cron-compatible command checks both the US trading calendar and configured report windows:

```bash
python3 -m portfolio_monitor --config /path/to/config.yaml run-if-due --send
```

Example cron entries for the required 10:00 AM ET and 2:30 PM ET reports:

```cron
CRON_TZ=America/New_York
0 10 * * 1-5 cd /workspace && python3 -m portfolio_monitor --config config.yaml run-if-due --send
30 14 * * 1-5 cd /workspace && python3 -m portfolio_monitor --config config.yaml run-if-due --send
```

Alternatively, use:

```bash
scripts/run_portfolio_monitor.sh
```

### Tests

```bash
python3 -m unittest discover -s tests -p "test_*.py"
```

### Safety and compliance behavior

- The tool does not connect to any brokerage API and cannot place orders.
- Recommendations are framed as buy/sell/hold hints with rationale, risks, invalidation triggers,
  and source links.
- AMD concentration is always assessed against the high and extreme concentration thresholds.
- Sell hints include position percentage, shares, dollar amount when price is available, reason,
  and urgency.
- Buy candidates include suggested allocation, approximate dollars/shares when price is available,
  add/new/rebalance context in the rationale, risk, and max position-size target.
