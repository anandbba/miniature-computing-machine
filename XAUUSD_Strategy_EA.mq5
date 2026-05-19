//+------------------------------------------------------------------+
//|                                     XAUUSD_Strategy_EA.mq5      |
//|   HTF Bias + Fib 61.8-88.6 + Gap Confluence + Stop Hunt Entry   |
//+------------------------------------------------------------------+
#property copyright "XAUUSD Strategy Bot"
#property version   "1.10"
#property description "XAUUSD: HTF bias, Fib golden pocket, gap confluence, stop-hunt trigger"

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>

//--- Direction
enum ENUM_BIAS { BIAS_BULL = 1, BIAS_BEAR = -1, BIAS_NEUTRAL = 0 };

//============================================================
//  INPUTS
//============================================================

input group "── Risk Management ──"
input double InpRiskPercent         = 1.0;    // Risk per trade (% of balance, hard cap $50)
input double InpDailyLossLimit      = 250.0;  // Daily loss hard stop ($)
input double InpMonthlyLossLimit    = 400.0;  // Monthly loss hard stop ($)
input int    InpMaxConcurrentTrades = 2;      // Max open positions at once

input group "── Session Filter (Server Time — set to match GMT) ──"
input int    InpLondonOpen   = 8;    // London open hour
input int    InpLondonClose  = 10;   // London close hour
input int    InpNYOpen       = 13;   // NY open hour
input int    InpNYClose      = 15;   // NY close hour
input bool   InpAllowAsian   = false; // Trade Asian session (lower size, more risk)

input group "── Strategy ──"
input int    InpSwingStrength   = 5;    // Bars each side to confirm a swing point
input double InpFibZoneStart    = 61.8; // Fib zone entry level (%)
input double InpFibZoneEnd      = 88.6; // Fib zone limit level (%)
input int    InpSLExtraPips     = 7;    // Extra pips beyond sweep wick for SL
input double InpMinRR           = 2.0;  // Minimum R:R required (vs TP1)
input int    InpGapMinPips      = 10;   // Minimum gap size to count as confluence (pips)
input int    InpSweepLookback   = 30;   // 15M bars to search for a sweep reference low/high

input group "── Trade Management ──"
input double InpTP1Percent      = 50.0; // Percent of position to close at TP1

input group "── News Filter ──"
input bool   InpUseNewsFilter   = true; // Use MT5 Economic Calendar to block trades near news
input int    InpNewsWindow      = 15;   // Minutes to avoid around high-impact US events

//============================================================
//  CONSTANTS / GLOBALS
//============================================================

#define EA_MAGIC 20260519

CTrade        g_trade;
CPositionInfo g_pos;

// Loss tracking
double      g_dayStartBal   = 0;
double      g_monthStartBal = 0;
double      g_dayLoss       = 0;
double      g_monthLoss     = 0;
MqlDateTime g_curDay;
MqlDateTime g_curMonth;

// Pause after consecutive losses
int      g_consecLosses = 0;
datetime g_pauseUntil   = 0;

// New-bar gate (only evaluate once per closed 15M bar)
datetime g_last15MBar = 0;

// Per-position state for trade management
struct STradeRec {
   ulong  ticket;   // position ticket
   double tp1;      // TP1 price
   double lots0;    // initial volume
   bool   tp1Done;  // partial close executed
   bool   beDone;   // breakeven set
};
STradeRec g_recs[];
int       g_recN = 0;

//============================================================
//  INIT / DEINIT
//============================================================

int OnInit() {
   g_trade.SetExpertMagicNumber(EA_MAGIC);
   g_trade.SetDeviationInPoints(30);
   g_trade.SetTypeFilling(ORDER_FILLING_IOC);

   MqlDateTime now;
   TimeToStruct(TimeCurrent(), now);
   g_curDay   = now;
   g_curMonth = now;

   g_dayStartBal   = AccountInfoDouble(ACCOUNT_BALANCE);
   g_monthStartBal = g_dayStartBal;

   LoadTodayLosses();

   PrintFormat("[XAU EA] Initialized | Balance: %.2f | Day loss carried: %.2f",
               g_dayStartBal, g_dayLoss);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
   Comment("");
}

//============================================================
//  MAIN TICK
//============================================================

void OnTick() {
   UpdateTracking();
   ManageTrades();

   if(!CanOpenTrade()) return;
   if(!InSession())    return;
   if(NewsBlocked())   return;

   // Process strategy only on each new closed 15M bar
   datetime curBar = iTime(_Symbol, PERIOD_M15, 0);
   if(curBar == g_last15MBar) return;
   g_last15MBar = curBar;

   RunStrategy();
}

//============================================================
//  STRATEGY CORE
//============================================================

void RunStrategy() {
   // 1. HTF Bias — D1 and H4 must agree
   ENUM_BIAS bias = GetHTFBias();
   if(bias == BIAS_NEUTRAL) {
      Comment("[XAU EA] No clear HTF bias — waiting");
      return;
   }

   // 2. Fib zone from most recent H4 swing
   double zBot, zTop, swH, swL;
   if(!GetFibZone(bias, zBot, zTop, swH, swL)) {
      Comment("[XAU EA] Cannot establish Fib zone");
      return;
   }

   // 3. Is price inside the golden pocket?
   double refPrice = (bias == BIAS_BULL)
                     ? SymbolInfoDouble(_Symbol, SYMBOL_ASK)
                     : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   if(refPrice < zBot || refPrice > zTop) {
      Comment(StringFormat("[XAU EA] %s | Price %.2f not in zone [%.2f – %.2f]",
              bias == BIAS_BULL ? "BULL" : "BEAR", refPrice, zBot, zTop));
      return;
   }

   // 4. Gap confluence (not mandatory, but noted)
   bool gap = GapInZone(zBot, zTop);

   // 5. Entry trigger: sweep + rejection/engulfing on 15M
   double entry, sl, tp1, tp2;
   if(!EntryTrigger(bias, zBot, zTop, swH, swL, entry, sl, tp1, tp2)) {
      Comment(StringFormat("[XAU EA] %s | In zone [%.2f – %.2f]%s | Awaiting trigger",
              bias == BIAS_BULL ? "BULL" : "BEAR", zBot, zTop, gap ? " +GAP" : ""));
      return;
   }

   // 6. R:R check against TP1
   double rr = MathAbs(tp1 - entry) / MathAbs(entry - sl);
   if(rr < InpMinRR) {
      PrintFormat("[XAU EA] Skipped — R:R %.2f below minimum %.2f", rr, InpMinRR);
      return;
   }

   // 7. Position size
   double lots = CalcLots(entry, sl);
   if(lots <= 0) return;

   // 8. Place trade
   OpenTrade(bias, sl, tp1, tp2, lots, gap);
}

//============================================================
//  HTF BIAS — Daily and H4 must both show same structure
//============================================================

ENUM_BIAS GetHTFBias() {
   ENUM_BIAS d1 = TFBias(PERIOD_D1);
   ENUM_BIAS h4 = TFBias(PERIOD_H4);
   if(d1 == BIAS_NEUTRAL || h4 == BIAS_NEUTRAL || d1 != h4) return BIAS_NEUTRAL;
   return d1;
}

ENUM_BIAS TFBias(ENUM_TIMEFRAMES tf) {
   double highs[], lows[];
   ArrayResize(highs, 0);
   ArrayResize(lows, 0);
   int scan = 100;

   for(int i = InpSwingStrength + 1; i < scan - InpSwingStrength; i++) {
      if(IsSwingHigh(tf, i)) {
         int n = ArraySize(highs);
         ArrayResize(highs, n + 1);
         highs[n] = iHigh(_Symbol, tf, i);
      }
      if(IsSwingLow(tf, i)) {
         int n = ArraySize(lows);
         ArrayResize(lows, n + 1);
         lows[n] = iLow(_Symbol, tf, i);
      }
   }

   // Require at least 2 swing highs and 2 swing lows
   if(ArraySize(highs) < 2 || ArraySize(lows) < 2) return BIAS_NEUTRAL;

   // Index 0 = most recent swing
   bool hh = (highs[0] > highs[1]);   // higher high
   bool hl = (lows[0]  > lows[1]);    // higher low
   bool lh = (highs[0] < highs[1]);   // lower high
   bool ll = (lows[0]  < lows[1]);    // lower low

   if(hh && hl) return BIAS_BULL;
   if(lh && ll) return BIAS_BEAR;
   return BIAS_NEUTRAL;
}

bool IsSwingHigh(ENUM_TIMEFRAMES tf, int bar) {
   double h = iHigh(_Symbol, tf, bar);
   for(int k = 1; k <= InpSwingStrength; k++) {
      if(iHigh(_Symbol, tf, bar - k) >= h) return false;
      if(iHigh(_Symbol, tf, bar + k) >= h) return false;
   }
   return true;
}

bool IsSwingLow(ENUM_TIMEFRAMES tf, int bar) {
   double l = iLow(_Symbol, tf, bar);
   for(int k = 1; k <= InpSwingStrength; k++) {
      if(iLow(_Symbol, tf, bar - k) <= l) return false;
      if(iLow(_Symbol, tf, bar + k) <= l) return false;
   }
   return true;
}

//============================================================
//  FIBONACCI ZONE  — from most recent H4 impulse swing
//============================================================

bool GetFibZone(ENUM_BIAS bias, double &zBot, double &zTop,
                double &swH, double &swL) {
   int scan = 200;

   if(bias == BIAS_BULL) {
      // For longs: find most recent swing HIGH on H4, then the swing LOW before it
      // Price path: swLow → swHigh → now retracing down into golden pocket
      int hBar = -1;
      for(int i = InpSwingStrength + 1; i < scan; i++) {
         if(IsSwingHigh(PERIOD_H4, i)) { hBar = i; break; }
      }
      if(hBar < 0) return false;

      int lBar = -1;
      for(int i = hBar + 1; i < scan; i++) {
         if(IsSwingLow(PERIOD_H4, i)) { lBar = i; break; }
      }
      if(lBar < 0) return false;

      swH = iHigh(_Symbol, PERIOD_H4, hBar);
      swL = iLow (_Symbol, PERIOD_H4, lBar);
      if(swH <= swL) return false;

      double range = swH - swL;
      zTop = swH - (InpFibZoneStart / 100.0) * range;  // 61.8% retracement
      zBot = swH - (InpFibZoneEnd   / 100.0) * range;  // 88.6% retracement
   }
   else { // BIAS_BEAR
      // For shorts: find most recent swing LOW on H4, then the swing HIGH before it
      // Price path: swHigh → swLow → now retracing up into golden pocket
      int lBar = -1;
      for(int i = InpSwingStrength + 1; i < scan; i++) {
         if(IsSwingLow(PERIOD_H4, i)) { lBar = i; break; }
      }
      if(lBar < 0) return false;

      int hBar = -1;
      for(int i = lBar + 1; i < scan; i++) {
         if(IsSwingHigh(PERIOD_H4, i)) { hBar = i; break; }
      }
      if(hBar < 0) return false;

      swH = iHigh(_Symbol, PERIOD_H4, hBar);
      swL = iLow (_Symbol, PERIOD_H4, lBar);
      if(swH <= swL) return false;

      double range = swH - swL;
      zBot = swL + (InpFibZoneStart / 100.0) * range;  // 61.8% retracement up
      zTop = swL + (InpFibZoneEnd   / 100.0) * range;  // 88.6% retracement up
   }

   return (zTop > zBot);
}

//============================================================
//  GAP DETECTION — unfilled price gap overlapping the Fib zone
//============================================================

bool GapInZone(double zBot, double zTop) {
   // 1 pip for XAUUSD = _Point * 10 (broker-standard 2-decimal pricing)
   double minGap = InpGapMinPips * _Point * 10.0;
   int    scan   = 60; // H1 bars

   for(int i = 1; i < scan - 1; i++) {
      double prevClose = iClose(_Symbol, PERIOD_H1, i + 1);
      double currOpen  = iOpen (_Symbol, PERIOD_H1, i);
      double gapSize   = MathAbs(currOpen - prevClose);
      if(gapSize < minGap) continue;

      double gL = MathMin(currOpen, prevClose);
      double gH = MathMax(currOpen, prevClose);

      // Must overlap the zone
      if(gL >= zTop || gH <= zBot) continue;

      // Check if the gap remains unfilled up to bar 1
      bool gapUp  = (currOpen > prevClose);
      bool filled = false;
      for(int j = i; j >= 1; j--) {
         if(gapUp  && iLow (_Symbol, PERIOD_H1, j) <= prevClose) { filled = true; break; }
         if(!gapUp && iHigh(_Symbol, PERIOD_H1, j) >= prevClose) { filled = true; break; }
      }
      if(!filled) return true;
   }
   return false;
}

//============================================================
//  ENTRY TRIGGER — stop hunt sweep + rejection/engulfing on 15M
//============================================================

bool EntryTrigger(ENUM_BIAS bias, double zBot, double zTop,
                  double swH, double swL,
                  double &entry, double &sl, double &tp1, double &tp2) {
   // 1 pip in price terms
   double pip    = _Point * 10.0;
   double zRange = zTop - zBot;

   if(bias == BIAS_BULL) {
      // Find a recent swing low on 15M at or near the zone (±15% of zone height)
      double refLow = DBL_MAX;
      for(int i = 2; i <= InpSweepLookback; i++) {
         if(!IsSwingLow(PERIOD_M15, i)) continue;
         double l = iLow(_Symbol, PERIOD_M15, i);
         if(l >= zBot - zRange * 0.15 && l <= zTop + zRange * 0.15) {
            refLow = l; break;
         }
      }
      if(refLow == DBL_MAX) return false;

      // Bar 1 (last closed bar) must have swept below refLow and then closed above it
      double b1L = iLow  (_Symbol, PERIOD_M15, 1);
      double b1C = iClose(_Symbol, PERIOD_M15, 1);
      double b1O = iOpen (_Symbol, PERIOD_M15, 1);
      double b1H = iHigh (_Symbol, PERIOD_M15, 1);

      if(!(b1L < refLow && b1C > refLow)) return false;
      if(b1C <= b1O) return false; // candle must close bullish

      // Confirmation: bullish rejection pin bar OR bullish engulfing
      double body   = b1C - b1O;
      double wLow   = b1O - b1L;
      bool   rejBar = (wLow >= body * 1.5); // lower wick ≥ 1.5× body

      double b2C    = iClose(_Symbol, PERIOD_M15, 2);
      double b2O    = iOpen (_Symbol, PERIOD_M15, 2);
      bool   engulf = (b2C < b2O)              // prev candle bearish
                   && (b1O <= b2C)             // our open at or below prev close
                   && (b1C >= b2O);            // our close at or above prev open

      if(!rejBar && !engulf) return false;

      entry = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      sl    = b1L - InpSLExtraPips * pip;
      tp1   = swH;                              // TP1 = prior swing high
      tp2   = swH + (swH - swL) * 0.272;       // TP2 = 127.2% extension

   } else { // BIAS_BEAR
      double refHigh = -DBL_MAX;
      for(int i = 2; i <= InpSweepLookback; i++) {
         if(!IsSwingHigh(PERIOD_M15, i)) continue;
         double h = iHigh(_Symbol, PERIOD_M15, i);
         if(h >= zBot - zRange * 0.15 && h <= zTop + zRange * 0.15) {
            refHigh = h; break;
         }
      }
      if(refHigh == -DBL_MAX) return false;

      double b1H = iHigh (_Symbol, PERIOD_M15, 1);
      double b1C = iClose(_Symbol, PERIOD_M15, 1);
      double b1O = iOpen (_Symbol, PERIOD_M15, 1);
      double b1L = iLow  (_Symbol, PERIOD_M15, 1);

      if(!(b1H > refHigh && b1C < refHigh)) return false;
      if(b1C >= b1O) return false; // must close bearish

      double body   = b1O - b1C;
      double wHigh  = b1H - b1O;
      bool   rejBar = (wHigh >= body * 1.5);

      double b2C    = iClose(_Symbol, PERIOD_M15, 2);
      double b2O    = iOpen (_Symbol, PERIOD_M15, 2);
      bool   engulf = (b2C > b2O)
                   && (b1O >= b2C)
                   && (b1C <= b2O);

      if(!rejBar && !engulf) return false;

      entry = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      sl    = b1H + InpSLExtraPips * pip;
      tp1   = swL;
      tp2   = swL - (swH - swL) * 0.272;
   }

   return true;
}

//============================================================
//  POSITION SIZING — risk-based, hard-capped at $50
//============================================================

double CalcLots(double entry, double sl) {
   double balance  = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskUSD  = MathMin(balance * InpRiskPercent / 100.0, 50.0);
   double slDist   = MathAbs(entry - sl);
   if(slDist <= 0) return 0;

   double tickSz  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double tickVal = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   if(tickSz <= 0 || tickVal <= 0) return 0;

   double riskPerLot = (slDist / tickSz) * tickVal;
   if(riskPerLot <= 0) return 0;

   double lots   = riskUSD / riskPerLot;
   double step   = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);

   lots = MathFloor(lots / step) * step;
   lots = MathMax(lots, minLot);
   lots = MathMin(lots, maxLot);
   return lots;
}

//============================================================
//  OPEN TRADE
//============================================================

void OpenTrade(ENUM_BIAS bias, double sl, double tp1, double tp2,
               double lots, bool gap) {
   // Block if we already have an open position of the same direction
   for(int i = PositionsTotal() - 1; i >= 0; i--) {
      if(!g_pos.SelectByIndex(i)) continue;
      if(g_pos.Symbol() != _Symbol || g_pos.Magic() != EA_MAGIC) continue;
      if(bias == BIAS_BULL && g_pos.PositionType() == POSITION_TYPE_BUY)  return;
      if(bias == BIAS_BEAR && g_pos.PositionType() == POSITION_TYPE_SELL) return;
   }

   string cmt = StringFormat("XAU-%s%s", bias == BIAS_BULL ? "BUY" : "SELL",
                                          gap ? "-GAP" : "");
   bool ok;
   if(bias == BIAS_BULL) ok = g_trade.Buy (lots, _Symbol, 0, sl, tp2, cmt);
   else                   ok = g_trade.Sell(lots, _Symbol, 0, sl, tp2, cmt);

   if(!ok) {
      PrintFormat("[XAU EA] Order FAILED | retcode %d | %s",
                  g_trade.ResultRetcode(), g_trade.ResultComment());
      return;
   }

   PrintFormat("[XAU EA] %s %.4f lots | SL:%.2f TP1:%.2f TP2:%.2f | Gap:%s",
               cmt, lots, sl, tp1, tp2, gap ? "Y" : "N");

   // Record position for management
   // On hedge accounts, order ticket == position ticket
   ulong posTicket = g_trade.ResultOrder();

   ArrayResize(g_recs, g_recN + 1);
   g_recs[g_recN].ticket  = posTicket;
   g_recs[g_recN].tp1     = tp1;
   g_recs[g_recN].lots0   = lots;
   g_recs[g_recN].tp1Done = false;
   g_recs[g_recN].beDone  = false;
   g_recN++;
}

//============================================================
//  TRADE MANAGEMENT — partial close at TP1, then move SL to BE
//============================================================

void ManageTrades() {
   for(int r = 0; r < g_recN; r++) {
      if(!g_pos.SelectByTicket(g_recs[r].ticket)) continue;

      bool isBuy  = (g_pos.PositionType() == POSITION_TYPE_BUY);
      double cur  = isBuy ? SymbolInfoDouble(_Symbol, SYMBOL_BID)
                          : SymbolInfoDouble(_Symbol, SYMBOL_ASK);

      // Partial close at TP1
      if(!g_recs[r].tp1Done) {
         bool hit = isBuy ? (cur >= g_recs[r].tp1) : (cur <= g_recs[r].tp1);
         if(hit) {
            double step  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
            double minV  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
            double close = MathFloor(g_pos.Volume() * InpTP1Percent / 100.0 / step) * step;
            close = MathMax(close, minV);
            if(g_trade.PositionClosePartial(g_recs[r].ticket, close)) {
               PrintFormat("[XAU EA] TP1 hit — closed %.4f lots on #%llu", close, g_recs[r].ticket);
               g_recs[r].tp1Done = true;
            }
         }
      }

      // Move SL to breakeven after TP1 partial close
      if(g_recs[r].tp1Done && !g_recs[r].beDone) {
         double openPx = g_pos.PriceOpen();
         double curSL  = g_pos.StopLoss();
         double curTP  = g_pos.TakeProfit();
         bool needBE   = isBuy ? (curSL < openPx) : (curSL > openPx);
         if(needBE) {
            if(g_trade.PositionModify(g_recs[r].ticket, openPx, curTP)) {
               PrintFormat("[XAU EA] SL → breakeven %.2f on #%llu", openPx, g_recs[r].ticket);
               g_recs[r].beDone = true;
            }
         } else {
            g_recs[r].beDone = true;
         }
      }
   }

   // Remove records for positions that are now closed
   for(int r = g_recN - 1; r >= 0; r--) {
      if(!g_pos.SelectByTicket(g_recs[r].ticket)) {
         for(int j = r; j < g_recN - 1; j++) g_recs[j] = g_recs[j + 1];
         g_recN--;
         ArrayResize(g_recs, g_recN);
      }
   }
}

//============================================================
//  SESSION FILTER
//============================================================

bool InSession() {
   MqlDateTime t;
   TimeToStruct(TimeCurrent(), t);
   int h = t.hour;
   if(h >= InpLondonOpen && h < InpLondonClose) return true;
   if(h >= InpNYOpen     && h < InpNYClose)     return true;
   if(InpAllowAsian && h < 7)                   return true;
   return false;
}

//============================================================
//  NEWS FILTER — MT5 Economic Calendar (high-impact US events)
//============================================================

bool NewsBlocked() {
   if(!InpUseNewsFilter) return false;

   MqlCalendarValue vals[];
   datetime t0 = TimeCurrent() - (datetime)(InpNewsWindow * 60);
   datetime t1 = TimeCurrent() + (datetime)(InpNewsWindow * 60);

   // Check US events (covers NFP, CPI, FOMC, PPI, etc.)
   int found = CalendarValueHistory(vals, t0, t1, "US", NULL);
   for(int i = 0; i < found; i++) {
      MqlCalendarEvent ev;
      if(!CalendarEventById(vals[i].event_id, ev)) continue;
      if(ev.importance == CALENDAR_IMPORTANCE_HIGH) {
         PrintFormat("[XAU EA] News block: high-impact event within %d min window", InpNewsWindow);
         return true;
      }
   }
   return false;
}

//============================================================
//  CAN OPEN TRADE — all hard limits enforced
//============================================================

bool CanOpenTrade() {
   // 24-hour pause after two consecutive losses
   if(g_pauseUntil > TimeCurrent()) {
      Comment(StringFormat("[XAU EA] PAUSED — resume %s (2 consecutive losses rule)",
              TimeToString(g_pauseUntil)));
      return false;
   }

   if(g_dayLoss >= InpDailyLossLimit) {
      Comment(StringFormat("[XAU EA] DAILY LIMIT $%.0f hit — done for the day. Screen off.",
              InpDailyLossLimit));
      return false;
   }

   if(g_monthLoss >= InpMonthlyLossLimit) {
      Comment(StringFormat("[XAU EA] MONTHLY LIMIT $%.0f hit — no more trading this month.",
              InpMonthlyLossLimit));
      return false;
   }

   int cnt = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--) {
      if(g_pos.SelectByIndex(i) &&
         g_pos.Symbol() == _Symbol &&
         g_pos.Magic()  == EA_MAGIC) cnt++;
   }
   if(cnt >= InpMaxConcurrentTrades) return false;

   return true;
}

//============================================================
//  TRACKING — daily and monthly loss, resets at midnight/month
//============================================================

void UpdateTracking() {
   MqlDateTime now;
   TimeToStruct(TimeCurrent(), now);

   if(now.day != g_curDay.day || now.mon != g_curDay.mon) {
      g_dayStartBal = AccountInfoDouble(ACCOUNT_BALANCE);
      g_dayLoss     = 0;
      g_curDay      = now;
      PrintFormat("[XAU EA] New day — balance reset to %.2f", g_dayStartBal);
   }

   if(now.mon != g_curMonth.mon) {
      g_monthStartBal = AccountInfoDouble(ACCOUNT_BALANCE);
      g_monthLoss     = 0;
      g_consecLosses  = 0;
      g_curMonth      = now;
      PrintFormat("[XAU EA] New month — monthly tracking reset");
   }

   // Use equity so floating drawdown counts against limits
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   g_dayLoss   = MathMax(0, g_dayStartBal   - equity);
   g_monthLoss = MathMax(0, g_monthStartBal - equity);
}

// Load today's realized losses from trade history on startup
void LoadTodayLosses() {
   datetime dayStart = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
   HistorySelect(dayStart, TimeCurrent());
   g_dayLoss = 0;
   for(int i = 0; i < HistoryDealsTotal(); i++) {
      ulong tk = HistoryDealGetTicket(i);
      if(!tk) continue;
      if(HistoryDealGetString (tk, DEAL_SYMBOL) != _Symbol) continue;
      if(HistoryDealGetInteger(tk, DEAL_MAGIC)  != EA_MAGIC) continue;
      if(HistoryDealGetInteger(tk, DEAL_ENTRY)  != DEAL_ENTRY_OUT) continue;
      double pnl = HistoryDealGetDouble(tk, DEAL_PROFIT)
                 + HistoryDealGetDouble(tk, DEAL_COMMISSION)
                 + HistoryDealGetDouble(tk, DEAL_SWAP);
      if(pnl < 0) g_dayLoss += MathAbs(pnl);
   }
}

//============================================================
//  TRADE TRANSACTION — track P&L in real time, enforce rules
//============================================================

void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest     &req,
                        const MqlTradeResult      &res) {
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD) return;

   ulong dk = trans.deal;
   if(!HistoryDealSelect(dk)) return;
   if(HistoryDealGetString (dk, DEAL_SYMBOL) != _Symbol)        return;
   if(HistoryDealGetInteger(dk, DEAL_MAGIC)  != EA_MAGIC)       return;
   if(HistoryDealGetInteger(dk, DEAL_ENTRY)  != DEAL_ENTRY_OUT) return;

   double pnl = HistoryDealGetDouble(dk, DEAL_PROFIT)
              + HistoryDealGetDouble(dk, DEAL_COMMISSION)
              + HistoryDealGetDouble(dk, DEAL_SWAP);

   if(pnl < 0) {
      double loss = MathAbs(pnl);
      g_dayLoss   += loss;
      g_monthLoss += loss;
      g_consecLosses++;

      PrintFormat("[XAU EA] Loss $%.2f | Day $%.2f | Month $%.2f | Streak %d",
                  loss, g_dayLoss, g_monthLoss, g_consecLosses);

      if(g_consecLosses >= 2) {
         g_pauseUntil   = TimeCurrent() + 86400; // 24 hours
         g_consecLosses = 0;
         PrintFormat("[XAU EA] 24h PAUSE — two consecutive losses. Resume: %s",
                     TimeToString(g_pauseUntil));
      }
   } else {
      g_consecLosses = 0;
      PrintFormat("[XAU EA] Win $%.2f | Streak reset", pnl);
   }
}
