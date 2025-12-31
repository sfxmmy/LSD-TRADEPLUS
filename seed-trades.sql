-- TRADING JOURNAL TEST DATA - ~150 Trades (2025)
-- Win Rate: ~45% | Starting Balance: $10,000
-- Timeframes: 5m (primary), 30m (secondary - higher RR)
-- Includes realistic winning/losing streaks
--
-- INSTRUCTIONS:
-- 1. First run the ALTER TABLE command below to add the extra_data column
-- 2. Get your account_id: SELECT id, name FROM accounts;
-- 3. Replace 'YOUR_ACCOUNT_ID_HERE' below with your actual account ID
-- 4. Run in Supabase SQL Editor

-- STEP 1: Add extra_data column (run this first!)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS extra_data JSONB;

DO $$
DECLARE
    acc_id UUID := 'YOUR_ACCOUNT_ID_HERE';
BEGIN

INSERT INTO trades (account_id, symbol, outcome, pnl, rr, direction, date, notes, extra_data) VALUES

-- JANUARY 2025 (12 trades) - Rough start, learning curve
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'long', '2025-01-03', 'Entered on London open breakout. Price reversed at resistance I missed on higher timeframe.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'short', '2025-01-06', 'Revenge trade after previous loss. Should have waited. Emotional trading.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"London"}'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 'short', '2025-01-07', 'Third loss in a row. Fakeout below support. Need to step back.', '{"confidence":"Low","rating":2,"timeframe":"5m","session":"Overlap"}'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 'long', '2025-01-10', 'Finally broke the losing streak. Clean 30m setup with confluence. Patient entry.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"London"}'),
(acc_id, 'NAS100', 'win', 250.00, 2.5, 'long', '2025-01-13', 'NY open momentum. Tech strong. Good follow through on previous win.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),
(acc_id, 'USDJPY', 'win', 300.00, 3.0, 'long', '2025-01-15', 'BOJ dovish. Three wins in a row now. Confidence building.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"Asian"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 'long', '2025-01-17', 'UK data miss. Entered before news - rookie mistake.', '{"confidence":"Medium","rating":1,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 4.0, 'long', '2025-01-22', 'Gold breakout on risk-off. Beautiful 30m trend trade. Held to target.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'long', '2025-01-24', 'Choppy price action. Got stopped in the noise.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'GBPJPY', 'win', 280.00, 2.8, 'long', '2025-01-27', 'Strong engulfing on 30m. Risk-on environment.', '{"confidence":"High","rating":4,"timeframe":"30m","session":"London"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 'long', '2025-01-28', 'Tech earnings miss. Overnight gap down killed me.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'XAUUSD', 'win', 300.00, 3.0, 'short', '2025-01-30', 'Gold pullback trade. Mean reversion worked perfectly.', '{"confidence":"Medium","rating":4,"timeframe":"5m","session":"London"}'),

-- FEBRUARY 2025 (13 trades) - Getting better, still inconsistent
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 'long', '2025-02-03', 'ECB hawkish surprise. Held through pullbacks.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -100.00, 1.0, 'long', '2025-02-05', 'False breakout. Got trapped with other longs.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'GBPJPY', 'win', 350.00, 3.5, 'long', '2025-02-07', 'Monster 30m move on risk-on. Let the winner run.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 'short', '2025-02-10', 'Tech still strong. Fighting the trend.', '{"confidence":"Low","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 'short', '2025-02-11', 'Doubled down on short bias. Wrong again. Two losses in a row.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"New York"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 'long', '2025-02-12', 'Third loss. Yen strength on safe haven. Need to stop.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 4.0, 'long', '2025-02-19', 'Took a break, came back fresh. Clean 30m trend continuation.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 'long', '2025-02-21', 'Fed minutes hawkish. Fundamental surprise.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 'long', '2025-02-25', 'NVIDIA earnings beat. Finally went with tech momentum.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'USDJPY', 'win', 450.00, 4.5, 'long', '2025-02-27', 'Dollar strength on yields. Beautiful 30m trend trade.', '{"confidence":"High","rating":4,"timeframe":"30m","session":"New York"}'),
(acc_id, 'XAUUSD', 'loss', -100.00, 1.0, 'short', '2025-02-28', 'Tried to short gold at highs. Still going higher.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"London"}'),
(acc_id, 'US30', 'win', 220.00, 2.2, 'long', '2025-02-28', 'End of month rally. Good read on sentiment.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),

-- MARCH 2025 (12 trades) - Hot streak mid-month
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'short', '2025-03-03', 'NFP week chop. Should avoid pre-data trading.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 300.00, 3.0, 'long', '2025-03-05', 'Safe haven bid ahead of NFP. Good read.', '{"confidence":"High","rating":4,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'GBPUSD', 'win', 450.00, 4.5, 'long', '2025-03-14', 'Strong UK employment. 30m breakout. Big win.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"London"}'),
(acc_id, 'US30', 'win', 200.00, 2.0, 'long', '2025-03-20', 'FOMC dovish pivot. Markets rallied hard.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPJPY', 'win', 380.00, 3.8, 'long', '2025-03-21', 'Risk-on post-Fed. Fourth win in a row!', '{"confidence":"High","rating":4,"timeframe":"30m","session":"London"}'),
(acc_id, 'EURUSD', 'win', 300.00, 3.0, 'long', '2025-03-25', 'Dollar weakness continues. Five wins straight.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 'long', '2025-03-27', 'Gold new highs. Six consecutive wins. Best streak ever.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 'short', '2025-03-28', 'Counter-trend failed. Streak ended.', '{"confidence":"Low","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 'long', '2025-03-31', 'Quarter end selling. Got caught.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 250.00, 2.5, 'long', '2025-03-31', 'Late day reversal. Quick scalp.', '{"confidence":"Medium","rating":3,"timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 'short', '2025-03-31', 'Quarter end chop. Small loss.', '{"confidence":"Low","rating":2,"timeframe":"5m","session":"Overlap"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'long', '2025-03-31', 'Overtraded end of month. Should have stopped.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"London"}'),

-- APRIL 2025 (13 trades) - Drawdown period then recovery
(acc_id, 'EURUSD', 'win', 320.00, 3.2, 'long', '2025-04-02', 'New quarter positioning. Clean entry.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -100.00, 1.0, 'short', '2025-04-04', 'Still trying to short gold. When will I learn?', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'win', 350.00, 3.5, 'long', '2025-04-07', 'Risk improving. Great 30m pullback entry.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"London"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 'long', '2025-04-09', 'CPI hot. Tech sold off hard.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 'long', '2025-04-10', 'Tried to buy dip. More selling.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 'long', '2025-04-11', 'Third loss in a row. Yen reversing.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"Asian"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 'short', '2025-04-14', 'Fourth loss. Chopped up badly.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"Asian"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 'long', '2025-04-14', 'Fifth consecutive loss. Worst streak. Taking a break.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 4.0, 'long', '2025-04-21', 'Back after break. Only taking A+ setups. 30m gold long.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 'long', '2025-04-24', 'Big tech earnings beat. Momentum trade.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'XAUUSD', 'win', 200.00, 2.0, 'long', '2025-04-29', 'Gold continuation. Trend following works.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'GBPUSD', 'win', 320.00, 3.2, 'short', '2025-04-30', 'Month end cable weakness. Four wins recovering losses.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 'short', '2025-04-30', 'Tried to short top. Rally continued.', '{"confidence":"Low","rating":2,"timeframe":"5m","session":"New York"}'),

-- MAY 2025 (12 trades) - Steady improvement
(acc_id, 'EURUSD', 'win', 280.00, 2.8, 'short', '2025-05-02', 'Sell in May effect. Good seasonal trade.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'GBPJPY', 'win', 300.00, 3.0, 'short', '2025-05-07', 'Risk-off hitting yen crosses. Right side finally.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"London"}'),
(acc_id, 'USDJPY', 'win', 250.00, 2.5, 'short', '2025-05-12', 'Yen strength continuation. Three in a row.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"Asian"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 'long', '2025-05-14', 'UK GDP miss. Fundamental surprise.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 450.00, 4.5, 'long', '2025-05-19', 'Gold breakout. 30m trend trade. Best of month.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 'long', '2025-05-21', 'Sell in May continues. Should respect seasonal.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 320.00, 3.2, 'short', '2025-05-26', 'Memorial day weakness. Caught short perfectly.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'short', '2025-05-27', 'Euro bounced. Short squeeze.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 200.00, 2.0, 'long', '2025-05-29', 'Gold trend following. Easy money.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'GBPUSD', 'win', 280.00, 2.8, 'short', '2025-05-30', 'Month end cable weakness. Good calendar awareness.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 'short', '2025-05-30', 'Month end rally caught my short.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 220.00, 2.2, 'long', '2025-05-30', 'Tech bounce. Good timing.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),

-- JUNE 2025 (13 trades) - Summer grind
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'long', '2025-06-02', 'Euro weak. Wrong side again.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 280.00, 2.8, 'long', '2025-06-04', 'Gold trending. Easy follow.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 'long', '2025-06-09', 'Apple WWDC hype. Momentum trade.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPUSD', 'win', 500.00, 5.0, 'long', '2025-06-13', 'UK rates hike surprise. Huge 30m move.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"London"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'short', '2025-06-16', 'ECB lifted euro. Stopped out.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'US30', 'win', 250.00, 2.5, 'long', '2025-06-20', 'Summer rally starting. Trend trade.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPJPY', 'win', 380.00, 3.8, 'long', '2025-06-23', 'Risk-on. Yen crosses flying. 30m setup.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"London"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 'short', '2025-06-25', 'Tried to short rally. Tech still strong.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'win', 280.00, 2.8, 'long', '2025-06-26', 'Dollar weakness into quarter end.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 200.00, 2.0, 'long', '2025-06-27', 'Only taking gold longs. System working.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"Overlap"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 'short', '2025-06-30', 'Quarter end squeeze. Got caught.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'US30', 'win', 250.00, 2.5, 'long', '2025-06-30', 'H1 close rally. Good seasonal.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 'long', '2025-06-30', 'Late entry at highs. Poor timing.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"New York"}'),

-- JULY 2025 (12 trades) - Strong performance
(acc_id, 'EURUSD', 'win', 280.00, 2.8, 'long', '2025-07-02', 'H2 starting strong. Good positioning.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'GBPJPY', 'win', 350.00, 3.5, 'long', '2025-07-07', 'Risk-on summer. 30m trend trade.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"London"}'),
(acc_id, 'USDJPY', 'win', 250.00, 2.5, 'long', '2025-07-11', 'Dollar strength on CPI. Three in a row.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"Asian"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 'long', '2025-07-14', 'Dollar bid continued. Wrong side.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 4.0, 'long', '2025-07-18', 'Gold higher. 30m breakout. Easy trade.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'US30', 'win', 200.00, 2.0, 'long', '2025-07-21', 'Earnings optimism. Trend trade.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 'long', '2025-07-24', 'Mega cap earnings beat. NASDAQ flying.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'short', '2025-07-25', 'Euro bounced. Short squeeze.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 200.00, 2.0, 'long', '2025-07-29', 'Gold continuation. Only longs.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'GBPUSD', 'win', 380.00, 3.8, 'long', '2025-07-30', 'BOE decision. 30m catalyst trade.', '{"confidence":"High","rating":4,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 'short', '2025-07-31', 'Month end rally. Wrong side.', '{"confidence":"Low","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 220.00, 2.2, 'long', '2025-07-31', 'Month end push. Good sentiment read.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),

-- AUGUST 2025 (12 trades) - Summer volatility
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'long', '2025-08-01', 'August weak start. Euro sold.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 280.00, 2.8, 'long', '2025-08-04', 'Safe haven bid. Trend trade.', '{"confidence":"High","rating":4,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 'short', '2025-08-08', 'Tech selling. Caught good short.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPUSD', 'win', 500.00, 5.0, 'short', '2025-08-13', 'UK inflation miss. Huge 30m drop.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"London"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 'long', '2025-08-20', 'Jackson Hole anxiety. Bad timing.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 'long', '2025-08-21', 'Doubled down. More selling.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPJPY', 'win', 380.00, 3.8, 'short', '2025-08-22', 'Risk-off JH. 30m yen strength trade.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"London"}'),
(acc_id, 'EURUSD', 'win', 280.00, 2.8, 'long', '2025-08-26', 'Dollar weakness post JH. Good read.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'USDJPY', 'win', 450.00, 4.5, 'short', '2025-08-27', 'Yen strength. Beautiful 30m trade.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 220.00, 2.2, 'long', '2025-08-28', 'Gold dollar weakness play.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"Overlap"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 'short', '2025-08-29', 'Month end squeeze. Small loss.', '{"confidence":"Low","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'US30', 'win', 250.00, 2.5, 'long', '2025-08-29', 'Month end rally. Good timing.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),

-- SEPTEMBER 2025 (13 trades) - Volatile month
(acc_id, 'EURUSD', 'win', 280.00, 2.8, 'short', '2025-09-02', 'September seasonality. Dollar strength.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -100.00, 1.0, 'long', '2025-09-04', 'Gold pulled back hard. Stopped.', '{"confidence":"Medium","rating":3,"timeframe":"5m","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 'long', '2025-09-08', 'Risk-off September. Wrong side.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 'long', '2025-09-09', 'Tried again. Still wrong. Three losses.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"London"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 'short', '2025-09-10', 'Tech weakness. Good short entry.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPUSD', 'win', 280.00, 2.8, 'short', '2025-09-15', 'UK data miss. Fundamental alignment.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 4.0, 'long', '2025-09-19', 'Gold post-FOMC rally. 30m trend.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'win', 280.00, 2.8, 'long', '2025-09-24', 'Risk sentiment improving. Good entry.', '{"confidence":"High","rating":4,"timeframe":"30m","session":"London"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 'long', '2025-09-26', 'Tech bounced then sold. Stopped on reversal.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'win', 280.00, 2.8, 'short', '2025-09-29', 'Quarter end dollar strength.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 200.00, 2.0, 'long', '2025-09-30', 'Gold safe haven bid. Easy trade.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'US30', 'win', 220.00, 2.2, 'long', '2025-09-30', 'Quarter end rally. Good read.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 'short', '2025-09-30', 'Tried to fade. Wrong side.', '{"confidence":"Low","rating":2,"timeframe":"5m","session":"New York"}'),

-- OCTOBER 2025 (13 trades) - Strong finish approaching
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'long', '2025-10-02', 'Q4 weak for euro. Wrong side.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 280.00, 2.8, 'long', '2025-10-06', 'Gold trending. System working.', '{"confidence":"High","rating":4,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 'long', '2025-10-10', 'Tech bouncing. Earnings optimism.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'USDJPY', 'win', 250.00, 2.5, 'long', '2025-10-14', 'Dollar strength continuing.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"Asian"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 'long', '2025-10-16', 'Dollar bid hurting cable.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 4.0, 'long', '2025-10-22', 'Gold new highs. 30m breakout.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'US30', 'win', 200.00, 2.0, 'long', '2025-10-24', 'Earnings rally. Good timing.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPJPY', 'win', 220.00, 2.2, 'long', '2025-10-27', 'Risk-on sentiment. Yen crosses flying.', '{"confidence":"High","rating":4,"timeframe":"30m","session":"London"}'),
(acc_id, 'EURUSD', 'win', 280.00, 2.8, 'short', '2025-10-30', 'Finally with the trend. Euro short worked.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 200.00, 2.0, 'long', '2025-10-31', 'Month end gold strength.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 'short', '2025-10-31', 'Cable squeezed. Got caught.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 'short', '2025-10-31', 'Halloween rally. Wrong side.', '{"confidence":"Low","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 250.00, 2.5, 'long', '2025-10-31', 'Month end tech push.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),

-- NOVEMBER 2025 (12 trades) - Election volatility then rally
(acc_id, 'EURUSD', 'win', 280.00, 2.8, 'short', '2025-11-03', 'Dollar strength into election.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -100.00, 1.0, 'long', '2025-11-05', 'Election volatility. Stopped on spike.', '{"confidence":"Medium","rating":3,"timeframe":"5m","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'win', 350.00, 3.5, 'long', '2025-11-07', 'Post-election risk-on. 30m setup.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"London"}'),
(acc_id, 'USDJPY', 'win', 250.00, 2.5, 'long', '2025-11-12', 'Dollar bid continuing.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"Asian"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 'long', '2025-11-14', 'Dollar strength hurting cable.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 4.0, 'long', '2025-11-19', 'Gold breaking higher. 30m geopolitical bid.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'US30', 'win', 200.00, 2.0, 'long', '2025-11-21', 'Thanksgiving rally starting.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 'long', '2025-11-25', 'Black Friday optimism. Tech flying.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'XAUUSD', 'win', 200.00, 2.0, 'long', '2025-11-28', 'Gold continuation. System working.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'GBPUSD', 'win', 320.00, 3.2, 'short', '2025-11-28', 'Month end cable weakness.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 'short', '2025-11-28', 'Month end rally. Wrong side.', '{"confidence":"Low","rating":2,"timeframe":"5m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 220.00, 2.2, 'long', '2025-11-28', 'Month end tech strength.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),

-- DECEMBER 2025 (12 trades) - Strong year end
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 'long', '2025-12-01', 'December weak for euro.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 280.00, 2.8, 'long', '2025-12-03', 'Year end gold buying. 30m trend.', '{"confidence":"High","rating":4,"timeframe":"30m","session":"Overlap"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 'long', '2025-12-08', 'Santa rally starting. Tech leading.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPUSD', 'win', 500.00, 5.0, 'long', '2025-12-12', 'UK data beat. Huge 30m cable rally.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"London"}'),
(acc_id, 'US30', 'win', 250.00, 2.5, 'long', '2025-12-19', 'Santa rally full swing. Indices flying.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPJPY', 'win', 380.00, 3.8, 'long', '2025-12-22', 'Year end risk-on. 30m yen cross trade.', '{"confidence":"High","rating":5,"timeframe":"30m","session":"London"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 'short', '2025-12-23', 'Tried to short Santa rally. Wrong.', '{"confidence":"Low","rating":1,"timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'win', 280.00, 2.8, 'long', '2025-12-24', 'Christmas Eve quick trade.', '{"confidence":"Medium","rating":3,"timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 200.00, 2.0, 'long', '2025-12-29', 'Year end gold strength.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"London"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 'short', '2025-12-30', 'Year end squeeze.', '{"confidence":"Medium","rating":2,"timeframe":"5m","session":"Overlap"}'),
(acc_id, 'US30', 'win', 250.00, 2.5, 'long', '2025-12-31', 'Final day rally. Great year end.', '{"confidence":"High","rating":5,"timeframe":"5m","session":"New York"}'),
(acc_id, 'NAS100', 'win', 220.00, 2.2, 'long', '2025-12-31', 'NYE momentum. Tech strong finish.', '{"confidence":"High","rating":4,"timeframe":"5m","session":"New York"}');

END $$;

-- VERIFICATION QUERY:
-- SELECT
--   COUNT(*) as total_trades,
--   SUM(CASE WHEN outcome='win' THEN 1 ELSE 0 END) as wins,
--   ROUND(100.0 * SUM(CASE WHEN outcome='win' THEN 1 ELSE 0 END) / COUNT(*), 1) as winrate,
--   SUM(pnl) as total_pnl
-- FROM trades
-- WHERE account_id = 'YOUR_ACCOUNT_ID_HERE';
