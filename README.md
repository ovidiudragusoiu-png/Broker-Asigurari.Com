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

## Portfolio News Advisor

This repository also includes a standalone Python automation called **Portfolio News Advisor**. It checks the configured stock portfolio on US trading days, generates a concise decision-support report, saves the report locally, and can send it by SMTP email and/or Telegram.

Important safety boundary: this tool **never places trades automatically**. It only produces manual-review buy/add/hold/trim/sell/watch hints with reasoning, confidence, sizing, timing, invalidation triggers, and risk warnings.

### Advisor files

- `main.py` - CLI entrypoint for one-off runs or the scheduler loop
- `config.yaml` - portfolio positions, risk rules, data-source settings, notification settings, and schedule
- `portfolio_analyzer.py` - position sizing, concentration risk, scoring, technical/news/risk rules, and recommendations
- `market_data.py` - yfinance quotes, daily moves, volume, 52-week range, moving averages, RSI, and volatility
- `news_fetcher.py` - optional Finnhub, NewsAPI, Alpha Vantage, GDELT, SEC filing, insider, analyst, earnings, and yfinance news fetchers
- `report_generator.py` - required report sections plus optional OpenAI polishing
- `notifier.py` - SMTP email and optional Telegram delivery with duplicate-send protection
- `scheduler.py` - APScheduler jobs with NYSE trading-day/holiday checks
- `requirements.txt` - Python dependencies
- `.env.example` - placeholders for API keys and delivery credentials

### Advisor setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill `.env` with the API keys and delivery credentials you want to use:

- `OPENAI_API_KEY` enables LLM polishing of the final report. Without it, the deterministic report is still generated.
- `FINNHUB_API_KEY`, `NEWSAPI_API_KEY`, and `ALPHA_VANTAGE_API_KEY` add news/earnings/analyst/insider coverage.
- GDELT and yfinance can run without API keys.
- `SMTP_*`, `EMAIL_SENDER`, and `EMAIL_RECIPIENT` enable email delivery.
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` enable Telegram if `notifications.telegram.enabled` is set to `true` in `config.yaml`.
- `CASH_AVAILABLE_USD` should be set if you want buy/add recommendations to size against available cash. If cash is unknown, the tool avoids unfunded buy recommendations.

Review `config.yaml` before running. In particular, confirm the `data_symbol` for `FLXK`; market-data vendors often require an exchange suffix for UCITS ETFs.

### Running one report

The command below is useful for setup testing because it bypasses weekend/holiday checks and does not send notifications:

```bash
python main.py --once morning --ignore-trading-day --dry-run
```

Generate and send a report only if today is a US trading day:

```bash
python main.py --once auto
```

Generate and save without sending:

```bash
python main.py --once midday --no-send
```

Reports are saved under `reports/`, logs under `logs/`, and duplicate-send state in `.portfolio_news_advisor_state.json`. These runtime files are ignored by git.

### Running the twice-daily scheduler

```bash
python main.py --schedule
```

Default schedule in `config.yaml`:

- Morning report: `10:15` America/New_York, 45 minutes after the regular US market open.
- Midday report: `13:30` America/New_York, roughly 2.5 hours before the regular close.
- NYSE trading calendar is used to avoid weekends and US market holidays.

For a server, run the scheduler with your preferred process manager, systemd unit, Docker container, or cron-managed long-running process.

### Scoring and risk model

Each stock receives a score from `-10` to `+10`:

- News sentiment: `-3` to `+3`
- Technical trend: `-2` to `+2`
- Valuation/expectations risk: `-2` to `+2`
- Earnings/guidance momentum: `-2` to `+2`
- Portfolio sizing/risk: `-1` to `+1`

Interpretation:

- `+6` to `+10`: consider buying/adding if position size and cash allow
- `+2` to `+5`: hold or small add
- `-1` to `+1`: hold/watch
- `-2` to `-5`: trim/watch closely
- `-6` to `-10`: sell/strong trim candidate

Risk rules in `config.yaml` keep the portfolio long-term growth oriented but disciplined:

- AMD is always flagged when it remains materially above the single-stock target band.
- AMD trims are staged by default; the tool does not recommend selling the whole position unless the thesis is severely damaged.
- Speculative holdings (`CHGG`, `FUBO`, `HNST`) are kept small and are not add candidates without clear improvement.
- Every sell/trim includes execution style, reason, trigger, and tax-review reminder.

### Disclaimer

Portfolio News Advisor is automated decision-support, not financial advice. Review all trades manually and consider taxes, liquidity, and personal risk tolerance before acting.
