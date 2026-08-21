# Bloomberg Dashboard

Finansowy dashboard inspirowany terminalami rynkowymi — Next.js 15, TypeScript, Tailwind CSS. Ciemny styl terminalowy, jawne oznaczenia jakości danych (`LIVE`, `OPÓŹNIONE`, `DEMO`) oraz bezkluczowe źródła z bezpiecznym fallbackiem demonstracyjnym.

---

## Spis treści

1. [Funkcje](#funkcje)
2. [Szybki start](#szybki-start)
3. [Tryb DEMO](#tryb-demo)
4. [Źródła danych](#źródła-danych)
5. [Klucze API](#klucze-api)
6. [Deploy — Vercel](#deploy--vercel)
7. [Deploy — Railway](#deploy--railway)
8. [Deploy — VPS / Docker](#deploy--vps--docker)
9. [Architektura projektu](#architektura-projektu)
10. [Wskaźniki techniczne](#wskaźniki-techniczne)
11. [Technologie](#technologie)

---

## Funkcje

| Moduł | Opis |
|-------|------|
| **Watchlista** | Lista obserwowanych aktywów (akcje + krypto), edytowalna, flash przy zmianie ceny |
| **Wykres** | TradingView Lightweight Charts (Area), timeframe 1M/3M/6M/1Y, OHLC nagłówek |
| **Ticker tape** | Scrollujący pasek cen u góry ekranu, auto-odświeżanie 30 s |
| **Wiadomości** | Panel z newsami z Yahoo Finance RSS + fallback mock |
| **Pasek newsów** | Scrollujące nagłówki na dole ekranu |
| **Kalendarz ekonomiczny** | Bieżące wydarzenia TradingView w czasie warszawskim + wyraźny fallback DEMO |
| **Alerty cenowe** | Alerty powyżej/poniżej ceny, persystentne w localStorage |
| **AI Podsumowanie** | Analiza sentymentu uziemiona w bieżącym snapshotcie cen lub jawne podsumowanie regułowe DEMO |
| **Screener rynku** | Tabela z wolumenem, RSI(14), mini-bar RSI, trendem, zmiennością |
| **Przegląd rynku** | Indeksy globalne, dominacja BTC, Indeks Strachu & Chciwości |
| **Status bar** | 8 indeksów rynkowych, 4 zegary stref czasowych, status giełdy |
| **Panel skrótów** | Modal `?` z listą skrótów klawiszowych |
| **Pasek funkcyjny** | Bloomberg-style F1–F8 + przycisk skrótów na dole |
| **Tryb kompaktowy** | Pionowy układ z nawigacją dla telefonów, tabletów i wąskich okien |

---

## Szybki start

**Wymagania:** Node.js ≥ 18, npm ≥ 9

```bash
# 1. Sklonuj
git clone <REPO_URL>
cd bloomberg-dashboard

# 2. Zainstaluj zależności
npm install

# 3. Skonfiguruj środowisko
cp .env.example .env.local
# Bez kluczy API — aplikacja korzysta z dostępnych źródeł bezkluczowych

# 4. Uruchom lokalnie
npm run dev
```

Otwórz **http://localhost:3000**

### Dostępne polecenia

| Polecenie | Opis |
|-----------|------|
| `npm run dev` | Serwer developerski (hot reload) |
| `npm run build` | Buduje wersję produkcyjną |
| `npm run start` | Uruchamia zbudowaną wersję produkcyjną |
| `npm run lint` | Sprawdzanie kodu ESLint |

---

## Tryb DEMO

Gdy wszystkie źródła danego instrumentu zawiodą lub nie ma połączenia z internetem, aplikacja używa fallbacku DEMO. Dane przykładowe nie są prezentowane jako notowania live, a każdy panel pokazuje jakość i źródło użytych danych.

Aby **wymusić** tryb DEMO niezależnie od kluczy:

```env
# .env.local
NEXT_PUBLIC_DEMO_MODE=true
```

Tryb DEMO aktywuje się automatycznie gdy:
- Wszystkie dostępne źródła zwrócą błąd lub nie znajdą symbolu
- Wystąpi rate limit albo awaria połączenia
- `NEXT_PUBLIC_DEMO_MODE=true`

W trybie DEMO działa w pełni: wykres świecowy, screener, alerty, AI podsumowanie, kalendarz, wiadomości.

---

## Źródła danych

### Bieżące kursy — TradingView Scanner (nieoficjalny)

- **Endpoint:** `https://scanner.tradingview.com/global/scan`
- **Typ dostępu:** Bez klucza, wyłącznie server-side
- **Zakres:** Bieżące kursy akcji, krypto, indeksów, FX i surowców

TradingView jest pierwszym źródłem snapshotów cen. Każdy taki rekord jest oznaczony jako `OPÓŹNIONE` oraz ma źródło `TradingView Scanner — nieoficjalne`, niezależnie od trybu raportowanego przez endpoint. To nie jest oficjalne publiczne API danych TradingView, więc endpoint może zmienić się lub przestać działać bez ostrzeżenia. Wtedy aplikacja automatycznie przechodzi do CoinGecko, Finnhub, Yahoo Finance, a na końcu do danych DEMO.

Ten sam przełącznik steruje kalendarzem ekonomicznym TradingView. Kalendarz pokazuje bieżące wydarzenia dla Polski, USA, strefy euro, Wielkiej Brytanii, Niemiec, Japonii i Chin, przeliczone na czas `Europe/Warsaw`. Przy awarii źródła panel przechodzi do jednoznacznie oznaczonego harmonogramu DEMO.

Adapter można wyłączyć bez zmian w kodzie:

```env
TRADINGVIEW_UNOFFICIAL_ENABLED=false
```

Dla spółek z GPW używaj symbolu Yahoo z sufiksem `.WA`, np. `CDR.WA` lub `PKN.WA`. Dane historyczne wykresów nadal pochodzą z CoinGecko, Finnhub albo Yahoo Finance.

### Ceny krypto — CoinGecko

**Strona:** https://www.coingecko.com/en/api  
**Typ dostępu:** Bezpłatny (bez klucza lub klucz Demo)  
**Co pobieramy:**
- Bieżące ceny, zmiana 24h, wolumen, kapitalizacja rynkowa
- Dane OHLCV dla wykresu — do 365 dni historii
- Globalne dane rynkowe (dominacja BTC, całkowita kapitalizacja)
- Endpoint: `/api/v3/simple/price`, `/api/v3/coins/{id}/ohlc`, `/api/v3/global`

**Limity bezpłatne:**
- Bez klucza: ~10–30 zapytań/min (publiczny limit)
- Klucz Demo (bezpłatny): 30 zapytań/min, brak paginacji danych historycznych
- Polecane: zarejestrować klucz Demo pod adresem powyżej

**Obsługiwane symbole (30+):** BTC, ETH, SOL, XRP, BNB, ADA, AVAX, DOT, MATIC/POL, LINK, DOGE, SHIB, TON, TRX, LTC, BCH, ATOM, UNI, NEAR, OP, ARB, SUI, APT, PEPE i inne

---

### Ceny akcji — Finnhub

**Strona:** https://finnhub.io  
**Typ dostępu:** Bezpłatny klucz API  
**Co pobieramy:**
- Real-time ceny akcji US (`/quote`)
- Profil spółki — nazwa, kapitalizacja (`/stock/profile2`)
- Dane OHLCV dzienne dla wykresu (`/stock/candle`)

**Limity bezpłatne:**
- 60 zapytań/min
- Dostęp do giełd: NYSE, NASDAQ, AMEX
- WebSocket real-time (plan bezpłatny obsługuje subskrypcję symboli)

**Rejestracja:** https://finnhub.io/register — formularz, bez karty płatniczej

---

### Ceny akcji (fallback) — Yahoo Finance nieoficjalne API

**Strona:** https://finance.yahoo.com  
**Typ dostępu:** Brak klucza, bez rejestracji  
**Co pobieramy:**
- Bieżące ceny akcji, zmiana dzienna
- Dane OHLCV dla wykresu (`/v8/finance/chart/{symbol}`)

**Uwaga:** To nieoficjalne API — Yahoo nie gwarantuje stabilności. Używane jako fallback gdy brak klucza Finnhub lub przy błędach. Może przestać działać bez ostrzeżenia.

**Obsługiwane symbole:** Wszystkie symbole notowane na Yahoo Finance (akcje US, ETF, indeksy)

---

### Wiadomości — RSS (bez klucza)

**Źródła (priorytet: PL → EN):**
- Bankier.pl — wiadomości ogólne + giełdowe
- Money.pl — wiadomości gospodarcze
- WSJ Markets — Wall Street Journal
- Yahoo Finance — top stories + krypto

**Typ dostępu:** Publiczne feedy RSS, brak klucza  
**Odświeżanie:** Co 5 minut  
**Limit:** Brak formalnego limitu

---

### AI Podsumowanie — Anthropic Claude (opcjonalnie)

**Strona:** https://console.anthropic.com  
**Model:** `claude-haiku-4-5-20251001` (najtańszy)  
**Co pobieramy:** Jedno zapytanie co 5 minut — analiza sentymentu rynku w języku polskim  
**Koszt szacunkowy:** ~$0.001 per zapytanie (Haiku 4.5)  
**Bez klucza:** Moduł pokazuje jawne podsumowanie regułowe wyliczone z dostępnego snapshotu cen, bez udawania odpowiedzi modelu AI.

---

### AI Podsumowanie — OpenAI (opcjonalnie, alternatywa)

**Strona:** https://platform.openai.com  
**Model:** `gpt-4o-mini`  
**Bez klucza:** Podsumowanie regułowe DEMO (tak samo jak dla Anthropic)

---

### Dane live (bez klucza)

| Dane | Źródło | Odśw. |
|------|--------|-------|
| Bieżące ceny akcji i krypto | TradingView Scanner (nieoficjalny), potem CoinGecko/Finnhub/Yahoo | 30 s |
| Indeksy globalne (SPX, NDX, VIX, FX, GOLD, OIL…) | TradingView Scanner (nieoficjalny), potem Yahoo Finance | 60 s |
| Kalendarz ekonomiczny | TradingView Economic Calendar (nieoficjalny), potem fallback DEMO | 15 min |
| Indeks Strachu & Chciwości | Alternative.me (bezpłatny) | 1 h |
| BTC dominacja + Total Market Cap | CoinGecko `/global` | 5 min |

### Dane statyczne / mock

Następujące dane mogą korzystać z fallbacku DEMO, gdy zewnętrzne źródła są niedostępne:

| Dane | Źródło | Uwagi |
|------|--------|-------|
| Kalendarz ekonomiczny | Dynamiczny harmonogram DEMO | Używany tylko po błędzie lub wyłączeniu TradingView |
| RSI/trend w screenerze | Dynamiczne OHLCV DEMO | Używane tylko, gdy CoinGecko/Finnhub/Yahoo nie zwrócą historii |

---

## Klucze API

Skopiuj `.env.example` jako `.env.local` i uzupełnij potrzebne klucze:

```bash
cp .env.example .env.local
```

| Zmienna | Gdzie uzyskać | Wymagane? |
|---------|---------------|-----------|
| `TRADINGVIEW_UNOFFICIAL_ENABLED` | — | Nie (`false` = wyłącz adapter) |
| `COINGECKO_API_KEY` | https://www.coingecko.com/en/api | Nie (działa bez klucza) |
| `FINNHUB_KEY` | https://finnhub.io/register | Zalecane dla akcji |
| `GROQ_API_KEY` | https://console.groq.com | Zalecane dla AI (darmowy) |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com | Nie (tryb mock) |
| `OPENAI_API_KEY` | https://platform.openai.com | Nie (tryb mock) |
| `NEXT_PUBLIC_DEMO_MODE` | — | Nie (`true` = wymuś demo) |

---

## Deploy — Vercel

Vercel to najprostszy sposób na deploy Next.js. Bezpłatny plan w zupełności wystarczy.

### Krok 1 — Przygotowanie repozytorium

```bash
git init
git add .
git commit -m "initial commit"
# Następnie utwórz repo na GitHub i wypchnij:
git remote add origin https://github.com/TWOJ_LOGIN/bloomberg-dashboard.git
git push -u origin main
```

### Krok 2 — Import projektu w Vercel

1. Zaloguj się na **https://vercel.com** (możesz użyć konta GitHub)
2. Kliknij **Add New → Project**
3. Wybierz repozytorium `bloomberg-dashboard`
4. Framework preset: **Next.js** (wykryty automatycznie)
5. Kliknij **Deploy** — pierwsza wersja bez kluczy API

### Krok 3 — Zmienne środowiskowe

Po pierwszym deploy:

1. Przejdź do: **Project → Settings → Environment Variables**
2. Dodaj zmienne z `.env.example` (tylko te, które posiadasz):

```
COINGECKO_API_KEY     = twoj_klucz
FINNHUB_KEY           = twoj_klucz
ANTHROPIC_API_KEY     = twoj_klucz
NEXT_PUBLIC_DEMO_MODE = false
```

3. Kliknij **Redeploy** aby zastosować zmiany

### Krok 4 — Automatyczny deploy (CD)

Każdy push do gałęzi `main` automatycznie wdraża nową wersję. Pulpit requestów jest dostępny na `https://vercel.com/dashboard`.

### Vercel CLI (alternatywa)

```bash
npm i -g vercel
vercel login
vercel                   # deploy preview
vercel --prod            # deploy produkcyjny
vercel env add FINNHUB_KEY production   # dodaj zmienną
```

**Uwaga na limity Vercel Free:**
- 100 GB bandwidth/miesiąc
- Serverless functions timeout: 10 s (wystarczy dla API routes)
- Concurrent builds: 1

---

## Deploy — Railway

Railway to platforma PaaS z obsługą Node.js, bezpłatny plan z $5 kredytu miesięcznie.

### Krok 1 — Przez panel (najprostsze)

1. Zaloguj się na **https://railway.app** (konto GitHub)
2. Kliknij **New Project → Deploy from GitHub repo**
3. Wybierz repozytorium `bloomberg-dashboard`
4. Railway automatycznie wykrywa Next.js i konfiguruje build

### Krok 2 — Zmienne środowiskowe

W panelu projektu:

1. Przejdź do zakładki **Variables**
2. Kliknij **New Variable** i dodaj:

```
COINGECKO_API_KEY     = twoj_klucz
FINNHUB_KEY           = twoj_klucz
ANTHROPIC_API_KEY     = twoj_klucz
NEXT_PUBLIC_DEMO_MODE = false
PORT                  = 3000
```

3. Każda zmiana zmiennych wywołuje automatyczny redeploy

### Krok 3 — Domena

1. Przejdź do: **Settings → Networking → Generate Domain**
2. Otrzymasz adres w formacie `bloomberg-dashboard-xxxx.up.railway.app`
3. Opcjonalnie: dodaj własną domenę w sekcji **Custom Domain**

### Railway CLI (alternatywa)

```bash
npm i -g @railway/cli
railway login
railway init                                        # inicjalizuj projekt
railway up                                          # deploy
railway variables set FINNHUB_KEY=twoj_klucz        # ustaw zmienną
railway open                                        # otwórz w przeglądarce
railway logs                                        # logi na żywo
```

**Uwaga na limity Railway Free:**
- $5 kredytu/miesiąc (ok. 500 godzin działania przy małej instancji)
- 512 MB RAM, 1 vCPU
- Brak limitu transferu

---

## Deploy — VPS / Docker

Dla pełnej kontroli (własny serwer, Hetzner, DigitalOcean, itp.).

### Dockerfile

Utwórz plik `Dockerfile` w katalogu projektu:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Dodaj do `next.config.mjs`:

```js
const nextConfig = {
  output: 'standalone',   // ← dodaj tę linię
  // ...
}
```

### Budowanie i uruchamianie

```bash
# Build obrazu
docker build -t bloomberg-dashboard .

# Uruchom kontener
docker run -d \
  -p 3000:3000 \
  -e FINNHUB_KEY=twoj_klucz \
  -e COINGECKO_API_KEY=twoj_klucz \
  -e ANTHROPIC_API_KEY=twoj_klucz \
  -e NEXT_PUBLIC_DEMO_MODE=false \
  --name bloomberg \
  bloomberg-dashboard
```

### Docker Compose (z nginx reverse proxy)

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    environment:
      - FINNHUB_KEY=${FINNHUB_KEY}
      - COINGECKO_API_KEY=${COINGECKO_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NEXT_PUBLIC_DEMO_MODE=false
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./certs:/etc/nginx/certs      # certyfikaty SSL
    depends_on:
      - app
    restart: unless-stopped
```

```bash
docker-compose up -d
```

### PM2 (bez Dockera)

```bash
# Na serwerze
git clone <REPO_URL> && cd bloomberg-dashboard
npm ci
npm run build

# Ustaw zmienne środowiskowe
export FINNHUB_KEY=twoj_klucz
export COINGECKO_API_KEY=twoj_klucz

# Uruchom z PM2
npm i -g pm2
pm2 start npm --name "bloomberg" -- start
pm2 save
pm2 startup   # autostart po restarcie serwera
```

---

## Architektura projektu

```
bloomberg-dashboard/
├── .env.example              # Szablon zmiennych środowiskowych
├── next.config.mjs
├── tailwind.config.ts
└── src/
    ├── app/
    │   ├── globals.css       # CRT efekty, animacje, kolory
    │   ├── layout.tsx
    │   ├── page.tsx          # Główny dashboard + obsługa skrótów
    │   └── api/
    │       ├── prices/       # GET /api/prices?symbols=BTC:crypto,AAPL:stock
    │       ├── chart/        # GET /api/chart?symbol=BTC&type=crypto&days=90
    │       ├── news/         # GET /api/news — RSS + fallback mock
    │       ├── screener/     # GET /api/screener — RSI, trend, zmienność
    │       ├── calendar/     # GET /api/calendar — zdarzenia makro
    │       └── ai-summary/   # GET /api/ai-summary — Claude/OpenAI/mock
    ├── components/
    │   ├── ui/
    │   │   ├── TerminalCard.tsx     # Kontener panelu z nagłówkiem
    │   │   ├── StatusBar.tsx        # Górny pasek z indeksami i zegarami
    │   │   ├── Ticker.tsx           # Scrollujące ceny
    │   │   ├── NewsTickerBar.tsx    # Scrollujące nagłówki newsów
    │   │   ├── FunctionBar.tsx      # Dolny pasek F1–F8
    │   │   └── KeyboardShortcuts.tsx# Modal skrótów (klawisz ?)
    │   ├── watchlist/Watchlist.tsx  # Lista z flash na zmianę ceny
    │   ├── chart/CandlestickChart.tsx
    │   ├── news/NewsPanel.tsx
    │   ├── calendar/EconomicCalendar.tsx
    │   ├── alerts/PriceAlerts.tsx
    │   ├── ai/AIMarketSummary.tsx
    │   ├── screener/MarketScreener.tsx
    │   └── market/MarketOverview.tsx
    ├── lib/
    │   ├── adapters/
    │   │   ├── tradingview.ts # Bieżące kursy z nieoficjalnego scannera
    │   │   ├── economicCalendar.ts # Bieżący kalendarz TradingView + walidacja
    │   │   ├── coingecko.ts   # Adapter CoinGecko API
    │   │   ├── finnhub.ts     # Adapter Finnhub API
    │   │   ├── yahoo.ts       # Adapter Yahoo Finance (unofficial)
    │   │   ├── mock.ts        # Dane demo — ceny, newsy, kalendarz, AI
    │   │   └── index.ts       # Orkiestrator: próbuje API → fallback mock
    │   ├── store/useStore.ts  # Zustand: watchlist, alerty, wybrany symbol
    │   └── utils/
    │       ├── formatters.ts  # formatPrice, formatVolume, formatRelativeTime
    │       └── rsi.ts         # RSI(14), SMA, zmienność annualizowana, trend
    └── types/index.ts         # Typy TypeScript: AssetPrice, OHLCBar, NewsItem…
```

### Przepływ danych

```
Przeglądarka
    │
    ├── SWR (co 30s) → /api/prices → adapters/index.ts
    │                                    ├── TradingView Scanner (pierwszy wybór)
    │                                    ├── CoinGecko/Finnhub (fallback)
    │                                    ├── Yahoo Finance (fallback akcji)
    │                                    └── mock.ts (fallback końcowy)
    │
    ├── SWR (on-demand) → /api/chart → getOHLC()
    │                                    ├── CoinGecko OHLCV
    │                                    ├── Finnhub candles
    │                                    └── mock generateOHLC()
    │
    ├── SWR (co 5min) → /api/news → Yahoo Finance RSS → mock
    ├── SWR (co 1min) → /api/screener → mock + RSI/trend obliczone server-side
    ├── SWR (co 15min) → /api/calendar → TradingView Calendar → mock
    └── SWR (co 5min) → /api/ai-summary → Claude/OpenAI → mock
```

---

## Wskaźniki techniczne

Obliczane server-side (`src/lib/utils/rsi.ts`) z danych OHLCV:

### RSI (14)

Relative Strength Index metodą Wildera. Wartości:
- **< 30** — wyprzedanie (OS — Oversold), sygnał kupna
- **> 70** — wykupienie (OB — Overbought), sygnał sprzedaży
- **30–70** — strefa neutralna

### Trend

Na podstawie krzyżowania średnich kroczących:
- **SMA(20) > SMA(50) i cena > SMA(20)** → Wzrostowy (bullish)
- **SMA(20) < SMA(50) i cena < SMA(20)** → Spadkowy (bearish)
- Inne → Boczny (neutral)

### Zmienność annualizowana

Odchylenie standardowe dziennych log-returns × √252 (dni handlowych w roku), wyrażone w procentach.

---

## Technologie

| Biblioteka | Wersja | Zastosowanie |
|-----------|--------|--------------|
| Next.js | 14.2 | Framework React, App Router, API routes |
| TypeScript | 5.x | Typowanie |
| Tailwind CSS | 3.4 | Stylowanie — dark terminal theme |
| lightweight-charts | 4.1 | TradingView wykres świecowy |
| Zustand | 4.5 | Stan globalny (watchlist, alerty) |
| SWR | 2.2 | Data fetching z auto-revalidation |
| date-fns | 3.6 | Formatowanie dat |
| clsx | 2.1 | Warunkowe klasy CSS |

---

## Licencja

MIT — używaj dowolnie, modyfikuj, wdrażaj.
