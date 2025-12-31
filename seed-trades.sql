-- TRADING JOURNAL TEST DATA - 203 Trades (2025)
-- Win Rate: ~43% | Average RR: 1:3 | Positive Expectancy Trader
--
-- INSTRUCTIONS:
-- 1. First, get your account_id by running: SELECT id, name FROM accounts;
-- 2. Replace 'YOUR_ACCOUNT_ID_HERE' below with your actual account ID
-- 3. Run this entire script in Supabase SQL Editor (supabase.com > SQL Editor)

-- Set your account ID here:
DO $$
DECLARE
    acc_id UUID := 'YOUR_ACCOUNT_ID_HERE';  -- <-- REPLACE THIS
BEGIN

-- Delete existing trades for clean slate (optional - comment out if you want to keep existing)
-- DELETE FROM trades WHERE account_id = acc_id;

-- Insert 203 trades spanning Jan 2025 - Dec 2025
INSERT INTO trades (account_id, symbol, outcome, pnl, rr, direction, date, risk, notes, extra_data) VALUES

-- JANUARY 2025 (17 trades)
(acc_id, 'EURUSD', 'loss', -150.00, 1.0, 'long', '2025-01-03', 1.5, 'Entered on London open breakout. Price reversed at resistance I missed on higher timeframe. Need to check HTF levels before entry.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 480.00, 3.2, 'long', '2025-01-06', 1.5, 'Clean break of Asian high with momentum. Held through minor pullback, took profit at previous swing high. Textbook setup.', '{"confidence":"High","rating":5,"timeframe":"1H","session":"London"}'),
(acc_id, 'GBPJPY', 'loss', -200.00, 1.0, 'short', '2025-01-08', 2.0, 'Fakeout below support. Got stopped out before the real move down happened. Position size was correct but timing was off.', '{"confidence":"Medium","rating":3,"timeframe":"15m","session":"Overlap"}'),
(acc_id, 'NAS100', 'win', 375.00, 2.5, 'long', '2025-01-10', 1.5, 'NY open momentum continuation. Tech stocks strong all week. Took partial at 2R, runner hit 2.5R. Good trade management.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'short', '2025-01-13', 1.0, 'Counter-trend trade against strong bullish momentum. Should have waited for better confirmation. Lesson: dont fight the trend.', '{"confidence":"Low","rating":1,"timeframe":"15m","session":"London"}'),
(acc_id, 'USDJPY', 'win', 450.00, 3.0, 'long', '2025-01-15', 1.5, 'BOJ dovish comments pushed yen weaker. Fundamental catalyst aligned with technical breakout. Perfect confluence.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"Asian"}'),
(acc_id, 'GBPUSD', 'loss', -175.00, 1.0, 'long', '2025-01-17', 1.75, 'UK data miss tanked cable. Entered before news - rookie mistake. Always check economic calendar!', '{"confidence":"Medium","rating":1,"timeframe":"1H","session":"London"}'),
(acc_id, 'US30', 'loss', -150.00, 1.0, 'short', '2025-01-20', 1.5, 'Tried to catch the top. Market kept grinding higher. Patience needed - wait for actual reversal confirmation.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"New York"}'),
(acc_id, 'XAUUSD', 'win', 600.00, 4.0, 'long', '2025-01-22', 1.5, 'Gold breaking out on risk-off sentiment. Held full position to 4R target. Best trade of the month.', '{"confidence":"High","rating":5,"timeframe":"1H","session":"Overlap"}'),
(acc_id, 'EURUSD', 'loss', -125.00, 1.0, 'long', '2025-01-24', 1.25, 'Choppy price action, got stopped in the noise. Should have used wider stop or skipped this setup entirely.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'GBPJPY', 'win', 500.00, 2.5, 'long', '2025-01-27', 2.0, 'Strong bullish engulfing on 4H. Risk-on environment supporting yen crosses. Clean entry and execution.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"London"}'),
(acc_id, 'NAS100', 'loss', -200.00, 1.0, 'long', '2025-01-28', 2.0, 'Tech earnings miss caused gap down. Overnight risk - need to reduce position size when holding through earnings.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"New York"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 'short', '2025-01-29', 1.0, 'Tried to fade the rally. Wrong side of momentum. Small loss, good risk management at least.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 300.00, 3.0, 'short', '2025-01-30', 1.0, 'Gold pullback after extended rally. Mean reversion setup worked perfectly. Quick in and out.', '{"confidence":"Medium","rating":4,"timeframe":"15m","session":"London"}'),
(acc_id, 'EURUSD', 'loss', -150.00, 1.0, 'short', '2025-01-31', 1.5, 'Month-end flows pushed against my position. Should have been aware of calendar effects.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"Overlap"}'),
(acc_id, 'GBPUSD', 'win', 350.00, 3.5, 'long', '2025-01-31', 1.0, 'Late month recovery trade. Caught the reversal perfectly. Took profit into monthly close.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"New York"}'),
(acc_id, 'US30', 'loss', -175.00, 1.0, 'long', '2025-01-31', 1.75, 'Chased the move, entered too late. Poor entry timing. Need more patience.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"New York"}'),

-- FEBRUARY 2025 (16 trades)
(acc_id, 'EURUSD', 'win', 400.00, 2.0, 'long', '2025-02-03', 2.0, 'ECB hawkish surprise. Euro strength across the board. Held to target despite pullbacks.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -200.00, 1.0, 'long', '2025-02-05', 2.0, 'False breakout above resistance. Got trapped with other longs. Volume wasnt there to support the move.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'GBPJPY', 'win', 750.00, 3.0, 'long', '2025-02-07', 2.5, 'Monster move on risk-on sentiment. Held through the entire NY session. Let the winner run.', '{"confidence":"High","rating":5,"timeframe":"1H","session":"Overlap"}'),
(acc_id, 'NAS100', 'loss', -150.00, 1.0, 'short', '2025-02-10', 1.5, 'Tech still strong. My short bias was wrong. Need to respect the trend more.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"New York"}'),
(acc_id, 'USDJPY', 'loss', -125.00, 1.0, 'long', '2025-02-12', 1.25, 'Yen strength on safe haven flows. Should have recognized the risk-off environment earlier.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"Asian"}'),
(acc_id, 'GBPUSD', 'win', 280.00, 2.8, 'short', '2025-02-14', 1.0, 'Valentines day low liquidity. Caught a nice drop during thin markets. Small size was appropriate.', '{"confidence":"Medium","rating":3,"timeframe":"15m","session":"London"}'),
(acc_id, 'EURUSD', 'loss', -175.00, 1.0, 'short', '2025-02-17', 1.75, 'Presidents day holiday in US. Low liquidity caused erratic moves. Shouldnt have traded.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 525.00, 3.5, 'long', '2025-02-19', 1.5, 'Clean trend continuation. Added to position on pullback. Perfect scaling in execution.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -200.00, 1.0, 'long', '2025-02-21', 2.0, 'Fed minutes more hawkish than expected. Market dropped, stopped out. Fundamental surprise.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"New York"}'),
(acc_id, 'GBPJPY', 'loss', -150.00, 1.0, 'short', '2025-02-24', 1.5, 'Counter-trend trade failed. JPY weakness continued. Fighting the trend again.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'win', 600.00, 3.0, 'long', '2025-02-25', 2.0, 'NVIDIA earnings beat. Tech ripping higher. Caught the momentum perfectly.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'long', '2025-02-26', 1.0, 'Consolidation zone trade. Got chopped up. Should wait for breakout.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'USDJPY', 'win', 400.00, 4.0, 'long', '2025-02-27', 1.0, 'Dollar strength on yields rising. Beautiful trend trade. Held overnight for gap up.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"New York"}'),
(acc_id, 'XAUUSD', 'loss', -175.00, 1.0, 'short', '2025-02-28', 1.75, 'Tried to short gold at highs. Still going higher. Dont fight the trend!', '{"confidence":"Low","rating":1,"timeframe":"1H","session":"London"}'),
(acc_id, 'GBPUSD', 'loss', -125.00, 1.0, 'long', '2025-02-28', 1.25, 'Month-end positioning went against me. Cable sold off hard into close.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"Overlap"}'),
(acc_id, 'US30', 'win', 450.00, 2.25, 'long', '2025-02-28', 2.0, 'End of month rally. Indices pushed higher into close. Good read on sentiment.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"New York"}'),

-- MARCH 2025 (18 trades)
(acc_id, 'EURUSD', 'loss', -150.00, 1.0, 'short', '2025-03-03', 1.5, 'NFP week positioning. Got caught in pre-NFP chop. Should avoid trading before big data.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 500.00, 2.5, 'long', '2025-03-05', 2.0, 'Safe haven bid ahead of NFP. Gold catching flight to safety flows.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'loss', -200.00, 1.0, 'long', '2025-03-07', 2.0, 'NFP volatility spike stopped me out. Whipsaw price action. Expected but still painful.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 375.00, 2.5, 'short', '2025-03-10', 1.5, 'Tech selling off on rate concerns. Finally caught a good short. Patience paid off.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"New York"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 'short', '2025-03-12', 1.0, 'BOJ still dovish. Yen keeps weakening. Wrong read on central bank policy.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"Asian"}'),
(acc_id, 'GBPUSD', 'win', 600.00, 4.0, 'long', '2025-03-14', 1.5, 'Strong UK employment data. Cable ripped higher. Fundamental catalyst entry.', '{"confidence":"High","rating":5,"timeframe":"1H","session":"London"}'),
(acc_id, 'EURUSD', 'loss', -175.00, 1.0, 'long', '2025-03-17', 1.75, 'St Patricks day low volume. Got stopped in thin market. Avoid holiday trading.', '{"confidence":"Low","rating":1,"timeframe":"15m","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -150.00, 1.0, 'short', '2025-03-19', 1.5, 'Gold still bid on geopolitical tensions. Fighting the safe haven flow.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"Overlap"}'),
(acc_id, 'US30', 'win', 400.00, 2.0, 'long', '2025-03-20', 2.0, 'FOMC dovish pivot. Markets rallied hard. Great fundamental trade.', '{"confidence":"High","rating":5,"timeframe":"15m","session":"New York"}'),
(acc_id, 'GBPJPY', 'win', 525.00, 3.5, 'long', '2025-03-21', 1.5, 'Risk-on post-Fed. Yen crosses flying. Added to winner on pullback.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"London"}'),
(acc_id, 'NAS100', 'loss', -200.00, 1.0, 'short', '2025-03-24', 2.0, 'Tried to short the bounce. Momentum still bullish. Wrong side again.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'win', 300.00, 3.0, 'long', '2025-03-25', 1.0, 'Dollar weakness continues post-Fed. Clean trend continuation setup.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"London"}'),
(acc_id, 'USDJPY', 'loss', -125.00, 1.0, 'long', '2025-03-26', 1.25, 'Position unwinding into quarter end. Got caught in the flows.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 450.00, 3.0, 'long', '2025-03-27', 1.5, 'Gold breaking out to new highs. Momentum trade worked beautifully.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"Overlap"}'),
(acc_id, 'GBPUSD', 'loss', -150.00, 1.0, 'short', '2025-03-28', 1.5, 'Counter-trend short failed. Cable still strong. Respect the trend!', '{"confidence":"Low","rating":2,"timeframe":"1H","session":"London"}'),
(acc_id, 'US30', 'loss', -175.00, 1.0, 'long', '2025-03-31', 1.75, 'Quarter end selling. Indices dropped into close. Didnt anticipate the flows.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 500.00, 2.5, 'long', '2025-03-31', 2.0, 'Late day reversal trade. Caught the bounce off lows. Quick scalp.', '{"confidence":"Medium","rating":3,"timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 'short', '2025-03-31', 1.0, 'Last trade of Q1. Small loss, acceptable. Quarter end chop.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"Overlap"}'),

-- APRIL 2025 (17 trades)
(acc_id, 'EURUSD', 'win', 350.00, 3.5, 'long', '2025-04-02', 1.0, 'New quarter positioning. Euro catching a bid. Clean breakout entry.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -200.00, 1.0, 'short', '2025-04-04', 2.0, 'Gold still in uptrend. My short bias keeps failing. Need to flip bias.', '{"confidence":"Low","rating":1,"timeframe":"15m","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'win', 600.00, 3.0, 'long', '2025-04-07', 2.0, 'Risk sentiment improving. Yen crosses leading higher. Great entry on pullback.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"London"}'),
(acc_id, 'NAS100', 'loss', -150.00, 1.0, 'long', '2025-04-09', 1.5, 'CPI came in hot. Tech sold off hard. Fundamental surprise hurt.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"New York"}'),
(acc_id, 'USDJPY', 'win', 400.00, 4.0, 'short', '2025-04-11', 1.0, 'Finally caught the yen reversal. BOJ hints at policy shift. Big move.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"Asian"}'),
(acc_id, 'GBPUSD', 'loss', -175.00, 1.0, 'long', '2025-04-14', 1.75, 'UK inflation miss. Cable dropped. Should have checked calendar.', '{"confidence":"Medium","rating":1,"timeframe":"1H","session":"London"}'),
(acc_id, 'EURUSD', 'loss', -125.00, 1.0, 'short', '2025-04-16', 1.25, 'Dollar weakness continues. Wrong side of the trade again.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 525.00, 3.5, 'long', '2025-04-18', 1.5, 'Finally went long gold. Trend following works. Should have done this weeks ago.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"Overlap"}'),
(acc_id, 'US30', 'win', 300.00, 2.0, 'long', '2025-04-21', 1.5, 'Monday reversal pattern. Indices bounced off support. Clean setup.', '{"confidence":"High","rating":4,"timeframe":"15m","session":"New York"}'),
(acc_id, 'GBPJPY', 'loss', -200.00, 1.0, 'short', '2025-04-23', 2.0, 'Counter-trend trade. Yen crosses still strong. Poor trade selection.', '{"confidence":"Low","rating":1,"timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'win', 750.00, 3.0, 'long', '2025-04-24', 2.5, 'Big tech earnings beat. NASDAQ flying. Caught the momentum perfectly.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'long', '2025-04-25', 1.0, 'Consolidation day. Got chopped up in range. Should have sat out.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'USDJPY', 'loss', -150.00, 1.0, 'long', '2025-04-28', 1.5, 'Yen strength returning. My long was wrong. Missed the reversal.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 2.0, 'long', '2025-04-29', 2.0, 'Gold continuation. Trend still intact. Easy trend following trade.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"London"}'),
(acc_id, 'GBPUSD', 'win', 350.00, 3.5, 'short', '2025-04-30', 1.0, 'Month end cable weakness. Caught the flow perfectly. Good calendar awareness.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -175.00, 1.0, 'short', '2025-04-30', 1.75, 'Tried to short the top. Month end rally continued. Wrong read.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"New York"}'),
(acc_id, 'NAS100', 'loss', -125.00, 1.0, 'long', '2025-04-30', 1.25, 'Chased the move at highs. Got stopped on pullback. Poor entry.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"New York"}'),

-- MAY 2025 (17 trades)
(acc_id, 'EURUSD', 'win', 450.00, 3.0, 'short', '2025-05-02', 1.5, 'Sell in May effect starting. Euro weakness on risk-off. Good seasonal trade.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -200.00, 1.0, 'short', '2025-05-05', 2.0, 'Tried to short gold again. Still in uptrend. When will I learn?', '{"confidence":"Low","rating":1,"timeframe":"15m","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'win', 500.00, 2.5, 'short', '2025-05-07', 2.0, 'Risk-off hitting yen crosses. Finally on the right side. Held to target.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"London"}'),
(acc_id, 'NAS100', 'loss', -150.00, 1.0, 'long', '2025-05-09', 1.5, 'Tech still under pressure. Tried to catch falling knife. Bad idea.', '{"confidence":"Medium","rating":1,"timeframe":"1H","session":"New York"}'),
(acc_id, 'USDJPY', 'win', 375.00, 2.5, 'short', '2025-05-12', 1.5, 'Yen strength on safe haven flows. Clean trend trade. Good execution.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"Asian"}'),
(acc_id, 'GBPUSD', 'loss', -175.00, 1.0, 'long', '2025-05-14', 1.75, 'UK GDP miss. Cable dropped hard. Fundamental surprise.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'long', '2025-05-16', 1.0, 'Counter-trend trade in downtrend. Should know better by now.', '{"confidence":"Low","rating":1,"timeframe":"15m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 600.00, 4.0, 'long', '2025-05-19', 1.5, 'Gold breaking out again. Finally trading with the trend. Great trade.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -200.00, 1.0, 'long', '2025-05-21', 2.0, 'Sell in May continues. Indices weak. Should have respected seasonal pattern.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"New York"}'),
(acc_id, 'GBPJPY', 'loss', -150.00, 1.0, 'long', '2025-05-23', 1.5, 'Tried to catch reversal too early. Risk-off still dominant.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'win', 525.00, 3.5, 'short', '2025-05-26', 1.5, 'Memorial day week weakness. Caught the short perfectly. Let it run.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"New York"}'),
(acc_id, 'EURUSD', 'loss', -125.00, 1.0, 'short', '2025-05-27', 1.25, 'Euro bounced hard. Short squeeze caught me. Size was appropriate though.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 'long', '2025-05-28', 1.0, 'Yen still strong. Wrong read on direction. Small loss.', '{"confidence":"Low","rating":2,"timeframe":"1H","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 2.0, 'long', '2025-05-29', 2.0, 'Gold continuation trade. Trend following pays. Easy money.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"London"}'),
(acc_id, 'GBPUSD', 'win', 300.00, 3.0, 'short', '2025-05-30', 1.0, 'Month end weakness in cable. Good calendar awareness trade.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -175.00, 1.0, 'short', '2025-05-30', 1.75, 'End of month rally caught my short. Flows went against me.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 450.00, 2.25, 'long', '2025-05-30', 2.0, 'Month end tech bounce. Caught the reversal. Good timing.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),

-- JUNE 2025 (17 trades)
(acc_id, 'EURUSD', 'loss', -150.00, 1.0, 'long', '2025-06-02', 1.5, 'New month, same struggle. Euro weak, I was long. Need to read PA better.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 500.00, 2.5, 'long', '2025-06-04', 2.0, 'Gold still trending. Easy trend following trade. Why fight it?', '{"confidence":"High","rating":5,"timeframe":"4H","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'loss', -200.00, 1.0, 'short', '2025-06-06', 2.0, 'NFP week volatility. Got stopped on spike. Expected but painful.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 600.00, 3.0, 'long', '2025-06-09', 2.0, 'Tech bouncing back. Apple WWDC hype. Momentum trade worked.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"New York"}'),
(acc_id, 'USDJPY', 'loss', -125.00, 1.0, 'short', '2025-06-11', 1.25, 'Fed still hawkish. Dollar strength. Wrong side of the trade.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"Asian"}'),
(acc_id, 'GBPUSD', 'win', 450.00, 4.5, 'long', '2025-06-13', 1.0, 'UK rates hike surprise. Cable ripped. Fundamental catalyst trade.', '{"confidence":"High","rating":5,"timeframe":"15m","session":"London"}'),
(acc_id, 'EURUSD', 'loss', -175.00, 1.0, 'short', '2025-06-16', 1.75, 'ECB commentary lifted euro. Stopped out. Need to watch central banks more.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -150.00, 1.0, 'short', '2025-06-18', 1.5, 'Still trying to short gold. Still wrong. Finally giving up on shorts.', '{"confidence":"Low","rating":1,"timeframe":"15m","session":"Overlap"}'),
(acc_id, 'US30', 'win', 375.00, 2.5, 'long', '2025-06-20', 1.5, 'Summer rally starting. Indices grinding higher. Good trend trade.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"New York"}'),
(acc_id, 'GBPJPY', 'win', 525.00, 3.5, 'long', '2025-06-23', 1.5, 'Risk-on sentiment. Yen crosses flying. Perfect entry on pullback.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"London"}'),
(acc_id, 'NAS100', 'loss', -200.00, 1.0, 'short', '2025-06-25', 2.0, 'Tried to short the rally. Tech still strong. Wrong again.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'win', 300.00, 3.0, 'long', '2025-06-26', 1.0, 'Dollar weakness into quarter end. Clean euro long.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"London"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 'long', '2025-06-27', 1.0, 'Yen catching bid into Q2 close. Wrong positioning.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 2.0, 'long', '2025-06-27', 2.0, 'Finally only taking gold longs. Trend following. Easy trade.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"Overlap"}'),
(acc_id, 'GBPUSD', 'loss', -150.00, 1.0, 'short', '2025-06-30', 1.5, 'Quarter end flows. Cable squeezed higher. Got caught.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"London"}'),
(acc_id, 'US30', 'win', 500.00, 2.5, 'long', '2025-06-30', 2.0, 'H1 close rally. Indices pushed to highs. Good seasonal trade.', '{"confidence":"High","rating":5,"timeframe":"15m","session":"New York"}'),
(acc_id, 'NAS100', 'loss', -125.00, 1.0, 'long', '2025-06-30', 1.25, 'Late entry at highs. Got stopped on pullback. Poor timing.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"New York"}'),

-- JULY 2025 (17 trades)
(acc_id, 'EURUSD', 'win', 450.00, 3.0, 'long', '2025-07-02', 1.5, 'H2 starting strong. Euro catching bid. Good new half positioning.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -200.00, 1.0, 'long', '2025-07-04', 2.0, 'July 4th low volume. Got stopped in thin market. Avoid holiday trading!', '{"confidence":"Medium","rating":1,"timeframe":"15m","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'win', 600.00, 3.0, 'long', '2025-07-07', 2.0, 'Risk-on continuing into summer. Yen crosses leading. Great setup.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"London"}'),
(acc_id, 'NAS100', 'loss', -150.00, 1.0, 'short', '2025-07-09', 1.5, 'Tech still strong. Stop shorting the trend. Lesson learned (again).', '{"confidence":"Low","rating":1,"timeframe":"1H","session":"New York"}'),
(acc_id, 'USDJPY', 'win', 375.00, 2.5, 'long', '2025-07-11', 1.5, 'Dollar strength on hot CPI. Good fundamental alignment.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"Asian"}'),
(acc_id, 'GBPUSD', 'loss', -175.00, 1.0, 'long', '2025-07-14', 1.75, 'Dollar bid continued. Cable dropped. Wrong side of USD move.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'long', '2025-07-16', 1.0, 'Euro still weak vs dollar. Counter-trend trade failed.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 525.00, 3.5, 'long', '2025-07-18', 1.5, 'Gold breaking higher again. Trend following works. Easy trade.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"Overlap"}'),
(acc_id, 'US30', 'win', 400.00, 2.0, 'long', '2025-07-21', 2.0, 'Earnings season optimism. Indices grinding higher. Trend trade.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"New York"}'),
(acc_id, 'GBPJPY', 'loss', -200.00, 1.0, 'short', '2025-07-23', 2.0, 'Counter-trend short failed. Risk-on too strong. Wrong side.', '{"confidence":"Low","rating":1,"timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'win', 750.00, 3.0, 'long', '2025-07-24', 2.5, 'Mega cap earnings beat. NASDAQ flying. Perfect timing.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'loss', -125.00, 1.0, 'short', '2025-07-25', 1.25, 'Euro bounced. Short squeeze. Size was appropriate.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"London"}'),
(acc_id, 'USDJPY', 'loss', -150.00, 1.0, 'short', '2025-07-28', 1.5, 'Dollar still strong. Yen weak. Wrong direction call.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 2.0, 'long', '2025-07-29', 2.0, 'Gold continuation. Only taking longs now. System trade.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"London"}'),
(acc_id, 'GBPUSD', 'win', 350.00, 3.5, 'long', '2025-07-30', 1.0, 'BOE rate decision. Cable rallied. Fundamental catalyst.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -175.00, 1.0, 'short', '2025-07-31', 1.75, 'Tried to short month end. Rally continued. Flows against me.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 450.00, 2.25, 'long', '2025-07-31', 2.0, 'Month end push higher. Tech leading. Good read on sentiment.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),

-- AUGUST 2025 (17 trades)
(acc_id, 'EURUSD', 'loss', -150.00, 1.0, 'long', '2025-08-01', 1.5, 'August starting weak. Euro sold off. Summer doldrums.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 500.00, 2.5, 'long', '2025-08-04', 2.0, 'Safe haven bid in August. Gold benefiting. Trend trade.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'loss', -200.00, 1.0, 'long', '2025-08-06', 2.0, 'Risk-off August sentiment. Yen strength hurt position.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'win', 600.00, 3.0, 'short', '2025-08-08', 2.0, 'Tech selling off. Finally caught a good short. Patient entry.', '{"confidence":"High","rating":5,"timeframe":"1H","session":"New York"}'),
(acc_id, 'USDJPY', 'loss', -125.00, 1.0, 'long', '2025-08-11', 1.25, 'Yen strength continues. Risk-off environment. Wrong side.', '{"confidence":"Low","rating":2,"timeframe":"1H","session":"Asian"}'),
(acc_id, 'GBPUSD', 'win', 450.00, 4.5, 'short', '2025-08-13', 1.0, 'UK inflation miss. Cable dropped hard. Fundamental trade.', '{"confidence":"High","rating":5,"timeframe":"15m","session":"London"}'),
(acc_id, 'EURUSD', 'loss', -175.00, 1.0, 'short', '2025-08-15', 1.75, 'Euro bounced. Short covering into weekend. Got caught.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -150.00, 1.0, 'short', '2025-08-18', 1.5, 'Tried to short gold resistance. Failed again. Only longs from now!', '{"confidence":"Low","rating":1,"timeframe":"15m","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -200.00, 1.0, 'long', '2025-08-20', 2.0, 'Jackson Hole anxiety. Markets sold off. Bad timing.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"New York"}'),
(acc_id, 'GBPJPY', 'win', 525.00, 3.5, 'short', '2025-08-22', 1.5, 'Risk-off into Jackson Hole. Yen strength. Perfect positioning.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"London"}'),
(acc_id, 'NAS100', 'loss', -150.00, 1.0, 'long', '2025-08-25', 1.5, 'Tried to buy the dip too early. More selling came. Patience needed.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'win', 300.00, 3.0, 'long', '2025-08-26', 1.0, 'Dollar weakness post Jackson Hole. Euro rallied. Good read.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"London"}'),
(acc_id, 'USDJPY', 'win', 400.00, 4.0, 'short', '2025-08-27', 1.0, 'Yen strength continuation. Beautiful trend trade. Let it run.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 450.00, 2.25, 'long', '2025-08-28', 2.0, 'Gold benefiting from dollar weakness. Easy trend trade.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"Overlap"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 'short', '2025-08-29', 1.0, 'Cable squeezed higher. Month end flows. Small loss.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'US30', 'win', 375.00, 2.5, 'long', '2025-08-29', 1.5, 'Month end rally. Indices pushed higher. Good timing.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"New York"}'),
(acc_id, 'NAS100', 'loss', -125.00, 1.0, 'short', '2025-08-29', 1.25, 'Tried to fade the rally. Tech kept going. Wrong side.', '{"confidence":"Low","rating":2,"timeframe":"5m","session":"New York"}'),

-- SEPTEMBER 2025 (17 trades)
(acc_id, 'EURUSD', 'win', 450.00, 3.0, 'short', '2025-09-02', 1.5, 'September seasonality kicking in. Dollar strength. Good short.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -200.00, 1.0, 'long', '2025-09-04', 2.0, 'Gold pulled back hard. Got stopped. Trend still intact though.', '{"confidence":"Medium","rating":3,"timeframe":"15m","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'loss', -150.00, 1.0, 'long', '2025-09-08', 1.5, 'Risk-off September. Yen strength. Wrong positioning.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'win', 600.00, 3.0, 'short', '2025-09-10', 2.0, 'Tech weakness in September. Good short entry. Trend trade.', '{"confidence":"High","rating":5,"timeframe":"1H","session":"New York"}'),
(acc_id, 'USDJPY', 'loss', -125.00, 1.0, 'long', '2025-09-12', 1.25, 'Dollar weakness surprised me. Yen rallied. Wrong read.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"Asian"}'),
(acc_id, 'GBPUSD', 'win', 375.00, 2.5, 'short', '2025-09-15', 1.5, 'UK data miss. Cable weakness. Fundamental alignment.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"London"}'),
(acc_id, 'EURUSD', 'loss', -175.00, 1.0, 'long', '2025-09-17', 1.75, 'FOMC week volatility. Got stopped before the move. Timing off.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 525.00, 3.5, 'long', '2025-09-19', 1.5, 'Gold rallying post-FOMC. Trend continuation. Perfect entry.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -200.00, 1.0, 'short', '2025-09-22', 2.0, 'Tried to short post-FOMC rally. Market still bid. Wrong side.', '{"confidence":"Low","rating":1,"timeframe":"1H","session":"New York"}'),
(acc_id, 'GBPJPY', 'win', 500.00, 2.5, 'long', '2025-09-24', 2.0, 'Risk sentiment improving. Yen crosses higher. Good entry.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"London"}'),
(acc_id, 'NAS100', 'loss', -150.00, 1.0, 'long', '2025-09-26', 1.5, 'Tech bounced then sold off. Got stopped on reversal.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'win', 300.00, 3.0, 'short', '2025-09-29', 1.0, 'Quarter end dollar strength. Good seasonal trade.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"London"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 'short', '2025-09-29', 1.0, 'Yen weak into Q3 close. Wrong direction. Small loss.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 2.0, 'long', '2025-09-30', 2.0, 'Gold into quarter end. Safe haven bid. Easy trade.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"London"}'),
(acc_id, 'GBPUSD', 'loss', -150.00, 1.0, 'long', '2025-09-30', 1.5, 'Q3 close flows. Cable sold. Wrong positioning.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"Overlap"}'),
(acc_id, 'US30', 'win', 450.00, 2.25, 'long', '2025-09-30', 2.0, 'Quarter end rally. Indices higher. Good read on flows.', '{"confidence":"High","rating":4,"timeframe":"15m","session":"New York"}'),
(acc_id, 'NAS100', 'loss', -125.00, 1.0, 'short', '2025-09-30', 1.25, 'Tried to fade Q3 close rally. Market kept going. Wrong side.', '{"confidence":"Low","rating":2,"timeframe":"5m","session":"New York"}'),

-- OCTOBER 2025 (17 trades)
(acc_id, 'EURUSD', 'loss', -150.00, 1.0, 'long', '2025-10-02', 1.5, 'Q4 starting weak for euro. Dollar strength. Wrong side.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 500.00, 2.5, 'long', '2025-10-06', 2.0, 'Gold trending higher. Easy trend trade. System working.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'loss', -200.00, 1.0, 'short', '2025-10-08', 2.0, 'Risk-on October. Yen crosses rallying. Wrong direction.', '{"confidence":"Low","rating":1,"timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'win', 600.00, 3.0, 'long', '2025-10-10', 2.0, 'Tech bouncing. Earnings optimism. Good long entry.', '{"confidence":"High","rating":5,"timeframe":"1H","session":"New York"}'),
(acc_id, 'USDJPY', 'win', 375.00, 2.5, 'long', '2025-10-14', 1.5, 'Dollar strength continuing. Good trend trade.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"Asian"}'),
(acc_id, 'GBPUSD', 'loss', -175.00, 1.0, 'long', '2025-10-16', 1.75, 'Dollar bid hurting cable. Wrong side of USD move.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'long', '2025-10-20', 1.0, 'Euro still weak. Counter-trend trade. Should know better.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 525.00, 3.5, 'long', '2025-10-22', 1.5, 'Gold breaking out. New highs. Beautiful trend trade.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"Overlap"}'),
(acc_id, 'US30', 'win', 400.00, 2.0, 'long', '2025-10-24', 2.0, 'Earnings season rally. Indices higher. Good timing.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"New York"}'),
(acc_id, 'GBPJPY', 'win', 450.00, 2.25, 'long', '2025-10-27', 2.0, 'Risk-on sentiment. Yen crosses flying. Good entry.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"London"}'),
(acc_id, 'NAS100', 'loss', -200.00, 1.0, 'short', '2025-10-29', 2.0, 'Tried to short the rally. Tech still strong. Wrong again.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'win', 300.00, 3.0, 'short', '2025-10-30', 1.0, 'Finally went with the trend. Euro short worked.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"London"}'),
(acc_id, 'USDJPY', 'loss', -150.00, 1.0, 'short', '2025-10-30', 1.5, 'Dollar still strong. Yen still weak. Wrong read.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 2.0, 'long', '2025-10-31', 2.0, 'Month end gold strength. Trend trade. Easy money.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"London"}'),
(acc_id, 'GBPUSD', 'loss', -125.00, 1.0, 'short', '2025-10-31', 1.25, 'Cable squeezed higher. Month end flows. Got caught.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -175.00, 1.0, 'short', '2025-10-31', 1.75, 'Tried to short Halloween rally. Market kept going.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 500.00, 2.5, 'long', '2025-10-31', 2.0, 'Month end tech push. Caught the momentum. Good trade.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),

-- NOVEMBER 2025 (17 trades)
(acc_id, 'EURUSD', 'win', 450.00, 3.0, 'short', '2025-11-03', 1.5, 'Dollar strength into election week. Good positioning.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -200.00, 1.0, 'long', '2025-11-05', 2.0, 'Election volatility. Got stopped on spike. Expected.', '{"confidence":"Medium","rating":3,"timeframe":"15m","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'win', 600.00, 3.0, 'long', '2025-11-07', 2.0, 'Post-election risk-on. Yen crosses ripping. Great trade.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"London"}'),
(acc_id, 'NAS100', 'loss', -150.00, 1.0, 'short', '2025-11-10', 1.5, 'Tech rallying post-election. Wrong side. Trend following needed.', '{"confidence":"Low","rating":2,"timeframe":"1H","session":"New York"}'),
(acc_id, 'USDJPY', 'win', 375.00, 2.5, 'long', '2025-11-12', 1.5, 'Dollar bid continuing. Good trend trade.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"Asian"}'),
(acc_id, 'GBPUSD', 'loss', -175.00, 1.0, 'long', '2025-11-14', 1.75, 'Dollar strength hurting cable. Wrong positioning.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'long', '2025-11-17', 1.0, 'Euro weakness continues. Counter-trend trade failed.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 525.00, 3.5, 'long', '2025-11-19', 1.5, 'Gold breaking higher. Geopolitical tensions. Safe haven.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"Overlap"}'),
(acc_id, 'US30', 'win', 400.00, 2.0, 'long', '2025-11-21', 2.0, 'Thanksgiving week rally starting. Seasonal trade.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"New York"}'),
(acc_id, 'GBPJPY', 'loss', -200.00, 1.0, 'short', '2025-11-24', 2.0, 'Risk-on too strong. Counter-trend failed.', '{"confidence":"Low","rating":1,"timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'win', 750.00, 3.0, 'long', '2025-11-25', 2.5, 'Black Friday optimism. Tech flying. Perfect timing.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'loss', -125.00, 1.0, 'short', '2025-11-26', 1.25, 'Thanksgiving low volume. Got stopped in thin market.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"London"}'),
(acc_id, 'USDJPY', 'loss', -150.00, 1.0, 'short', '2025-11-27', 1.5, 'Dollar still strong. Wrong direction.', '{"confidence":"Medium","rating":2,"timeframe":"15m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 2.0, 'long', '2025-11-28', 2.0, 'Gold continuation. Trend trade. System working.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"London"}'),
(acc_id, 'GBPUSD', 'win', 350.00, 3.5, 'short', '2025-11-28', 1.0, 'Month end cable weakness. Good flow trade.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -175.00, 1.0, 'short', '2025-11-28', 1.75, 'Tried to short month end. Rally continued.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 450.00, 2.25, 'long', '2025-11-28', 2.0, 'Month end tech strength. Good read on flows.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),

-- DECEMBER 2025 (17 trades)
(acc_id, 'EURUSD', 'loss', -150.00, 1.0, 'long', '2025-12-01', 1.5, 'December starting weak for euro. Seasonal dollar strength.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 500.00, 2.5, 'long', '2025-12-03', 2.0, 'Year end gold buying. Trend continuation. Easy trade.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'loss', -200.00, 1.0, 'short', '2025-12-05', 2.0, 'Risk-on into year end. Yen crosses higher. Wrong side.', '{"confidence":"Low","rating":2,"timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'win', 600.00, 3.0, 'long', '2025-12-08', 2.0, 'Santa rally starting. Tech leading higher. Perfect entry.', '{"confidence":"High","rating":5,"timeframe":"1H","session":"New York"}'),
(acc_id, 'USDJPY', 'loss', -125.00, 1.0, 'short', '2025-12-10', 1.25, 'Dollar strong into FOMC. Wrong positioning.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"Asian"}'),
(acc_id, 'GBPUSD', 'win', 450.00, 4.5, 'long', '2025-12-12', 1.0, 'UK data beat. Cable rallied hard. Fundamental trade.', '{"confidence":"High","rating":5,"timeframe":"15m","session":"London"}'),
(acc_id, 'EURUSD', 'loss', -175.00, 1.0, 'short', '2025-12-15', 1.75, 'Euro bounced into year end. Got squeezed.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -150.00, 1.0, 'short', '2025-12-17', 1.5, 'Tried to short gold at highs. Failed. Only longs!', '{"confidence":"Low","rating":1,"timeframe":"15m","session":"Overlap"}'),
(acc_id, 'US30', 'win', 375.00, 2.5, 'long', '2025-12-19', 1.5, 'Santa rally in full swing. Indices flying.', '{"confidence":"High","rating":4,"timeframe":"1H","session":"New York"}'),
(acc_id, 'GBPJPY', 'win', 525.00, 3.5, 'long', '2025-12-22', 1.5, 'Year end risk-on. Yen crosses strong. Great trade.', '{"confidence":"High","rating":5,"timeframe":"4H","session":"London"}'),
(acc_id, 'NAS100', 'loss', -200.00, 1.0, 'short', '2025-12-23', 2.0, 'Tried to short Santa rally. Market kept going.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'win', 300.00, 3.0, 'long', '2025-12-24', 1.0, 'Christmas Eve low volume. Caught a move. Quick trade.', '{"confidence":"Medium","rating":3,"timeframe":"15m","session":"London"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 'long', '2025-12-26', 1.0, 'Boxing day thin markets. Got stopped. Avoid holidays!', '{"confidence":"Low","rating":1,"timeframe":"15m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 2.0, 'long', '2025-12-29', 2.0, 'Year end gold strength. Final trend trade of year.', '{"confidence":"High","rating":4,"timeframe":"4H","session":"London"}'),
(acc_id, 'GBPUSD', 'loss', -150.00, 1.0, 'short', '2025-12-30', 1.5, 'Year end positioning. Cable squeezed.', '{"confidence":"Medium","rating":2,"timeframe":"1H","session":"Overlap"}'),
(acc_id, 'US30', 'win', 500.00, 2.5, 'long', '2025-12-31', 2.0, 'Final day rally. Year end push. Great way to end.', '{"confidence":"High","rating":5,"timeframe":"15m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 450.00, 2.25, 'long', '2025-12-31', 2.0, 'New Years Eve momentum. Tech closing strong. Perfect finish.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}');

END $$;

-- VERIFICATION QUERIES (run after inserting)
-- Check trade count:
-- SELECT COUNT(*) as total_trades FROM trades WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- Check win rate:
-- SELECT
--   COUNT(*) as total,
--   SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
--   ROUND(100.0 * SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) / COUNT(*), 1) as win_rate
-- FROM trades WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';

-- Check total PnL:
-- SELECT SUM(pnl) as total_pnl FROM trades WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';
