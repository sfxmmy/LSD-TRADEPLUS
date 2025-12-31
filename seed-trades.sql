-- TRADING JOURNAL SEED DATA - 158 Trades (2025)
-- Win Rate: ~48% | Starting Balance: $10,000 | Risk: 1% per trade
-- Uses individual columns for confidence, rating, timeframe, session (NOT extra_data)
--
-- INSTRUCTIONS:
-- 1. Replace account ID below with your actual account ID
-- 2. Run in Supabase SQL Editor
-- 3. This will DELETE existing trades for this account and insert fresh demo data

-- STEP 1: Add missing columns if they don't exist
ALTER TABLE trades ADD COLUMN IF NOT EXISTS risk DECIMAL(5,2);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS confidence TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS timeframe TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS session TEXT;

-- STEP 2: Delete existing trades for this account (prevents duplicates)
DELETE FROM trades WHERE account_id = '615da27e-d788-4a5f-902d-df1ab836ae14';

-- STEP 3: Reset custom_inputs to NULL so app uses default inputs
UPDATE accounts SET custom_inputs = NULL WHERE id = '615da27e-d788-4a5f-902d-df1ab836ae14';

DO $$
DECLARE
    acc_id UUID := '615da27e-d788-4a5f-902d-df1ab836ae14';
BEGIN

INSERT INTO trades (account_id, symbol, outcome, pnl, rr, risk, direction, date, notes, confidence, rating, timeframe, session) VALUES

-- ==================== JANUARY 2025 (13 trades) ====================
-- Rough start, finding footing. Mixed results.
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-01-02', 'First trade of the year. Entered on London open breakout but got faked out.', 'Medium', 2, '5m', 'London'),
(acc_id, 'XAUUSD', 'win', 200.00, 2.0, 1.0, 'long', '2025-01-03', 'Gold momentum trade. Clean break of Asian high.', 'High', 4, '15m', 'London'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-01-06', 'Counter-trend trade. Should have waited.', 'Low', 2, '5m', 'Overlap'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'long', '2025-01-07', 'Tech weak. Tried to catch falling knife.', 'Medium', 1, '5m', 'New York'),
(acc_id, 'USDJPY', 'win', 150.00, 1.5, 1.0, 'long', '2025-01-08', 'Dollar strength on yields.', 'High', 4, '15m', 'Asian'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-01-10', 'Choppy pre-NFP. Should have stayed flat.', 'Low', 1, '5m', 'London'),
(acc_id, 'XAUUSD', 'win', 600.00, 6.0, 1.0, 'long', '2025-01-13', 'Beautiful 30m setup. Gold breaking out. 6R runner!', 'High', 5, '30m', 'Overlap'),
(acc_id, 'GBPUSD', 'win', 180.00, 1.8, 1.0, 'long', '2025-01-15', 'UK CPI beat. Cable rallied hard.', 'High', 4, '15m', 'London'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 1.0, 'long', '2025-01-17', 'Indices choppy. Got stopped in noise.', 'Medium', 2, '5m', 'New York'),
(acc_id, 'GBPJPY', 'win', 280.00, 2.8, 1.0, 'long', '2025-01-20', 'Risk-on Monday. Yen crosses flying.', 'High', 5, '30m', 'London'),
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-01-22', 'ECB dovish comments. Euro weakness.', 'High', 4, '15m', 'London'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'short', '2025-01-24', 'Tried to short tech. Dont fight momentum.', 'Low', 2, '5m', 'New York'),
(acc_id, 'XAUUSD', 'win', 300.00, 3.0, 1.0, 'long', '2025-01-27', 'Gold continuation. Trend is friend.', 'High', 5, '30m', 'Overlap'),

-- ==================== FEBRUARY 2025 (12 trades) ====================
-- BAD MONTH - Overtrading, revenge trading. Down month.
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-02-03', 'Wrong read on BOJ.', 'Medium', 2, '5m', 'Asian'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-02-04', 'UK data miss. Two losses in a row.', 'Medium', 2, '5m', 'London'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-02-05', 'Revenge trading. Three losses. Stop.', 'Low', 1, '5m', 'London'),
(acc_id, 'XAUUSD', 'win', 150.00, 1.5, 1.0, 'long', '2025-02-10', 'Finally a win. Small target though.', 'Medium', 3, '15m', 'Overlap'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'long', '2025-02-12', 'Tech still weak. Bad timing.', 'Medium', 2, '5m', 'New York'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-02-13', 'Wrong side again. Frustrating.', 'Low', 1, '5m', 'London'),
(acc_id, 'US30', 'win', 180.00, 1.8, 1.0, 'long', '2025-02-17', 'Presidents Day rally.', 'High', 4, '15m', 'New York'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-02-19', 'Euro squeezed. Another loss.', 'Medium', 2, '5m', 'London'),
(acc_id, 'XAUUSD', 'win', 200.00, 2.0, 1.0, 'long', '2025-02-21', 'Gold still trending. Saved the week.', 'High', 4, '30m', 'Overlap'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-02-24', 'Yen weak. Wrong direction.', 'Medium', 2, '5m', 'Asian'),
(acc_id, 'GBPUSD', 'win', 150.00, 1.5, 1.0, 'long', '2025-02-26', 'Cable bounce. Small win.', 'Medium', 3, '5m', 'London'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'short', '2025-02-28', 'Month end squeeze. Brutal month.', 'Low', 2, '5m', 'New York'),

-- ==================== MARCH 2025 (14 trades) ====================
-- RECOVERY - Hot streak mid-month (6 wins in a row)
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-03-03', 'NFP week chop. Stay patient.', 'Low', 1, '5m', 'London'),
(acc_id, 'XAUUSD', 'win', 300.00, 3.0, 1.0, 'long', '2025-03-05', 'Gold bid pre-NFP. Safe haven.', 'High', 4, '30m', 'Overlap'),
(acc_id, 'GBPJPY', 'win', 250.00, 2.5, 1.0, 'long', '2025-03-10', 'Risk-on post NFP. Yen crosses ripping.', 'High', 4, '15m', 'London'),
(acc_id, 'US30', 'win', 200.00, 2.0, 1.0, 'long', '2025-03-12', 'Indices breaking out. Follow through.', 'High', 4, '15m', 'New York'),
(acc_id, 'EURUSD', 'win', 280.00, 2.8, 1.0, 'long', '2025-03-14', 'Euro strength on ECB. Four in a row!', 'High', 5, '15m', 'London'),
(acc_id, 'XAUUSD', 'win', 700.00, 7.0, 1.0, 'long', '2025-03-17', 'Gold breakout. Five wins. 7R MONSTER!', 'High', 5, '30m', 'Overlap'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 1.0, 'long', '2025-03-19', 'FOMC dovish. SIX consecutive wins!', 'High', 5, '15m', 'New York'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-03-21', 'Tried to fade. Streak ended. Great run.', 'Low', 2, '5m', 'London'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'long', '2025-03-24', 'Dollar strength resuming.', 'High', 4, '15m', 'Asian'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-03-26', 'Yen strength surprised. Risk-off.', 'Medium', 2, '5m', 'Overlap'),
(acc_id, 'XAUUSD', 'win', 250.00, 2.5, 1.0, 'long', '2025-03-27', 'Gold safe haven bid.', 'High', 4, '30m', 'London'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 1.0, 'long', '2025-03-28', 'Quarter end selling.', 'Medium', 2, '5m', 'New York'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-03-31', 'Month end chop.', 'Low', 1, '5m', 'London'),
(acc_id, 'NAS100', 'win', 180.00, 1.8, 1.0, 'long', '2025-03-31', 'Late day bounce. End month green.', 'Medium', 3, '5m', 'New York'),

-- ==================== APRIL 2025 (14 trades) ====================
-- WORST DRAWDOWN - 5 losses in a row then recovery
(acc_id, 'GBPUSD', 'win', 220.00, 2.2, 1.0, 'long', '2025-04-02', 'Q2 starting well. Cable breakout.', 'High', 4, '15m', 'London'),
(acc_id, 'XAUUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-04-04', 'Tried to short gold. Dumb trade.', 'Low', 1, '5m', 'Overlap'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-04-07', 'Yen intervention rumors. Two losses.', 'Medium', 2, '5m', 'Asian'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'long', '2025-04-09', 'CPI hot. Tech dumping. Three losses.', 'Medium', 2, '5m', 'New York'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-04-10', 'Dollar strength. Four losses.', 'Medium', 2, '5m', 'London'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-04-11', 'FIVE losses in a row. Taking a break.', 'Low', 1, '5m', 'Overlap'),
(acc_id, 'XAUUSD', 'win', 800.00, 8.0, 1.0, 'long', '2025-04-21', 'Back from break. A+ setup only. 8R MONSTER!', 'High', 5, '30m', 'Overlap'),
(acc_id, 'US30', 'win', 250.00, 2.5, 1.0, 'long', '2025-04-23', 'Indices recovering. Momentum trade.', 'High', 4, '15m', 'New York'),
(acc_id, 'GBPUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-04-24', 'UK retail miss. Three wins recovering.', 'High', 4, '15m', 'London'),
(acc_id, 'EURUSD', 'win', 280.00, 2.8, 1.0, 'long', '2025-04-25', 'Euro bounce. Fully recovered!', 'High', 4, '15m', 'London'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'short', '2025-04-28', 'Tried to short rally. Wrong.', 'Low', 2, '5m', 'New York'),
(acc_id, 'XAUUSD', 'win', 300.00, 3.0, 1.0, 'long', '2025-04-29', 'Gold still trending.', 'High', 5, '30m', 'Overlap'),
(acc_id, 'USDJPY', 'win', 180.00, 1.8, 1.0, 'long', '2025-04-30', 'Month end dollar bid.', 'High', 4, '15m', 'Asian'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-04-30', 'Overtraded. Should have stopped.', 'Low', 1, '5m', 'London'),

-- ==================== MAY 2025 (13 trades) ====================
-- Good month. Steady improvement.
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-05-02', 'Sell in May. Euro weakness.', 'High', 4, '15m', 'London'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 1.0, 'long', '2025-05-05', 'Gold 30m continuation.', 'High', 5, '30m', 'Overlap'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'long', '2025-05-07', 'Tech wobbling.', 'Medium', 2, '5m', 'New York'),
(acc_id, 'GBPUSD', 'win', 220.00, 2.2, 1.0, 'short', '2025-05-09', 'BOE dovish. Cable weakness.', 'High', 4, '15m', 'London'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-05-12', 'Yen still weak. Wrong side.', 'Medium', 2, '5m', 'Asian'),
(acc_id, 'GBPJPY', 'win', 280.00, 2.8, 1.0, 'long', '2025-05-14', 'Risk-on. Yen crosses flying.', 'High', 4, '30m', 'Overlap'),
(acc_id, 'XAUUSD', 'win', 650.00, 6.5, 1.0, 'long', '2025-05-16', 'Gold breakout. 6.5R monster!', 'High', 5, '30m', 'Overlap'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 1.0, 'short', '2025-05-19', 'Indices rallying. Dont short.', 'Low', 1, '5m', 'New York'),
(acc_id, 'EURUSD', 'win', 180.00, 1.8, 1.0, 'long', '2025-05-21', 'Euro bounce on ECB.', 'Medium', 3, '5m', 'London'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 1.0, 'long', '2025-05-23', 'NVIDIA hype. Tech ripping.', 'High', 5, '15m', 'New York'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-05-27', 'UK holiday. Thin liquidity.', 'Low', 2, '5m', 'London'),
(acc_id, 'XAUUSD', 'win', 250.00, 2.5, 1.0, 'long', '2025-05-29', 'Gold continuation.', 'High', 4, '30m', 'Overlap'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'long', '2025-05-30', 'Month end dollar strength.', 'High', 4, '15m', 'Asian'),

-- ==================== JUNE 2025 (13 trades) ====================
-- Summer grind. Consistent.
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-06-02', 'Euro bounced. Summer chop.', 'Medium', 2, '5m', 'London'),
(acc_id, 'GBPJPY', 'win', 300.00, 3.0, 1.0, 'long', '2025-06-04', 'Risk-on. 30m setup.', 'High', 5, '30m', 'Overlap'),
(acc_id, 'XAUUSD', 'win', 280.00, 2.8, 1.0, 'long', '2025-06-06', 'Gold trending.', 'High', 4, '30m', 'Overlap'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'short', '2025-06-09', 'Tech strong. Stop fighting.', 'Low', 1, '5m', 'New York'),
(acc_id, 'US30', 'win', 220.00, 2.2, 1.0, 'long', '2025-06-11', 'FOMC week. Indices bid.', 'High', 4, '15m', 'New York'),
(acc_id, 'GBPUSD', 'win', 750.00, 7.5, 1.0, 'long', '2025-06-13', 'UK data beat. 7.5R RUNNER! Best of month.', 'High', 5, '30m', 'London'),
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'long', '2025-06-16', 'Dollar weak post FOMC.', 'High', 4, '15m', 'London'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-06-18', 'Yen strength. Bad read.', 'Medium', 2, '5m', 'Asian'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 1.0, 'long', '2025-06-20', 'Gold continuation. 30m perfect.', 'High', 5, '30m', 'Overlap'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-06-23', 'Risk back on. Wrong side.', 'Low', 2, '5m', 'London'),
(acc_id, 'NAS100', 'win', 250.00, 2.5, 1.0, 'long', '2025-06-25', 'Tech summer rally.', 'High', 4, '15m', 'New York'),
(acc_id, 'US30', 'win', 200.00, 2.0, 1.0, 'long', '2025-06-27', 'Quarter end rally.', 'High', 4, '15m', 'New York'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-06-30', 'Quarter end rebalancing.', 'Medium', 2, '5m', 'London'),

-- ==================== JULY 2025 (13 trades) ====================
-- Strong performance.
(acc_id, 'XAUUSD', 'win', 400.00, 4.0, 1.0, 'long', '2025-07-02', 'H2 starting strong. Gold breakout.', 'High', 5, '30m', 'Overlap'),
(acc_id, 'GBPUSD', 'win', 220.00, 2.2, 1.0, 'long', '2025-07-04', 'US holiday. Cable higher.', 'High', 4, '15m', 'London'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-07-07', 'Yen strength. Wrong read.', 'Medium', 2, '5m', 'Asian'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 1.0, 'long', '2025-07-09', 'Tech earnings optimism.', 'High', 5, '15m', 'New York'),
(acc_id, 'EURUSD', 'win', 180.00, 1.8, 1.0, 'long', '2025-07-11', 'Euro strength on data.', 'Medium', 3, '5m', 'London'),
(acc_id, 'GBPJPY', 'win', 350.00, 3.5, 1.0, 'long', '2025-07-14', 'Risk-on. 30m monster.', 'High', 5, '30m', 'Overlap'),
(acc_id, 'XAUUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-07-16', 'Tried to fade gold. Learn lesson.', 'Low', 1, '5m', 'Overlap'),
(acc_id, 'US30', 'win', 250.00, 2.5, 1.0, 'long', '2025-07-18', 'Earnings rally.', 'High', 4, '15m', 'New York'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-07-21', 'Cable squeezed.', 'Medium', 2, '5m', 'London'),
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-07-23', 'ECB dovish.', 'High', 4, '15m', 'London'),
(acc_id, 'NAS100', 'win', 280.00, 2.8, 1.0, 'long', '2025-07-25', 'Big tech beat.', 'High', 5, '15m', 'New York'),
(acc_id, 'XAUUSD', 'win', 300.00, 3.0, 1.0, 'long', '2025-07-28', 'Gold continuation.', 'High', 4, '30m', 'Overlap'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'long', '2025-07-30', 'Month end dollar bid.', 'High', 4, '15m', 'Asian'),

-- ==================== AUGUST 2025 (13 trades) ====================
-- TOUGH MONTH - Summer volatility. Choppy.
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-08-01', 'August weak start. Yen strength.', 'Medium', 2, '5m', 'Overlap'),
(acc_id, 'XAUUSD', 'win', 200.00, 2.0, 1.0, 'long', '2025-08-04', 'Gold safe haven.', 'High', 4, '30m', 'Overlap'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-08-06', 'Euro weakness. Two losses.', 'Medium', 2, '5m', 'London'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'long', '2025-08-08', 'Tech selling on rates.', 'Medium', 2, '5m', 'New York'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 1.0, 'long', '2025-08-11', 'Indices weak. Four losses total.', 'Medium', 2, '5m', 'New York'),
(acc_id, 'GBPUSD', 'win', 300.00, 3.0, 1.0, 'short', '2025-08-13', 'UK inflation miss. Cable tanked.', 'High', 5, '30m', 'London'),
(acc_id, 'USDJPY', 'win', 150.00, 1.5, 1.0, 'short', '2025-08-15', 'Yen strength continuing.', 'High', 4, '15m', 'Asian'),
(acc_id, 'XAUUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-08-18', 'Gold pullback. Got stopped.', 'Medium', 2, '15m', 'Overlap'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-08-20', 'Jackson Hole anxiety. Risk-off.', 'Medium', 2, '5m', 'London'),
(acc_id, 'EURUSD', 'win', 180.00, 1.8, 1.0, 'long', '2025-08-22', 'Post JH dollar weakness.', 'High', 4, '15m', 'London'),
(acc_id, 'NAS100', 'win', 200.00, 2.0, 1.0, 'long', '2025-08-25', 'Tech bouncing.', 'High', 4, '15m', 'New York'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 1.0, 'short', '2025-08-27', 'Indices squeezed.', 'Low', 2, '5m', 'New York'),
(acc_id, 'XAUUSD', 'win', 180.00, 1.8, 1.0, 'long', '2025-08-29', 'Month end gold. Scraped green.', 'High', 3, '30m', 'Overlap'),

-- ==================== SEPTEMBER 2025 (13 trades) ====================
-- Volatile but profitable.
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-09-01', 'September seasonality. Dollar strong.', 'Medium', 2, '5m', 'London'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'long', '2025-09-03', 'Dollar bid. Yen weakness.', 'High', 4, '15m', 'Asian'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 1.0, 'long', '2025-09-05', 'Gold 30m breakout.', 'High', 5, '30m', 'Overlap'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-09-08', 'Euro weak. Dollar strong.', 'Medium', 2, '5m', 'London'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-09-10', 'Risk-off. Yen strength.', 'Medium', 2, '5m', 'Overlap'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 1.0, 'short', '2025-09-12', 'Tech rolling over. Good short.', 'High', 5, '15m', 'New York'),
(acc_id, 'US30', 'win', 220.00, 2.2, 1.0, 'short', '2025-09-15', 'Indices weak. Following momentum.', 'High', 4, '15m', 'New York'),
(acc_id, 'XAUUSD', 'win', 550.00, 5.5, 1.0, 'long', '2025-09-17', 'FOMC week. Gold safe haven. 5.5R!', 'High', 5, '30m', 'Overlap'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-09-19', 'Cable squeezed post FOMC.', 'Medium', 2, '5m', 'London'),
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-09-22', 'Euro weakness.', 'High', 4, '15m', 'London'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-09-24', 'Yen intervention.', 'Medium', 2, '5m', 'Asian'),
(acc_id, 'NAS100', 'win', 250.00, 2.5, 1.0, 'long', '2025-09-26', 'Tech bouncing. Q end rally.', 'High', 4, '15m', 'New York'),
(acc_id, 'XAUUSD', 'win', 280.00, 2.8, 1.0, 'long', '2025-09-30', 'Quarter end gold strength.', 'High', 4, '30m', 'Overlap'),

-- ==================== OCTOBER 2025 (13 trades) ====================
-- Strong Q4 start.
(acc_id, 'GBPJPY', 'win', 300.00, 3.0, 1.0, 'long', '2025-10-02', 'Q4 risk-on. Yen crosses strong.', 'High', 5, '30m', 'Overlap'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-10-06', 'Euro still weak.', 'Medium', 2, '5m', 'London'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 1.0, 'long', '2025-10-08', 'Gold trending. 30m continuation.', 'High', 5, '30m', 'Overlap'),
(acc_id, 'NAS100', 'win', 280.00, 2.8, 1.0, 'long', '2025-10-10', 'Tech earnings optimism.', 'High', 4, '15m', 'New York'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 1.0, 'short', '2025-10-13', 'Tried to short rally.', 'Low', 1, '5m', 'New York'),
(acc_id, 'GBPUSD', 'win', 220.00, 2.2, 1.0, 'long', '2025-10-15', 'UK data beat. Cable rally.', 'High', 4, '15m', 'London'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'long', '2025-10-17', 'Dollar strength.', 'High', 4, '15m', 'Asian'),
(acc_id, 'XAUUSD', 'win', 400.00, 4.0, 1.0, 'long', '2025-10-20', 'Gold new highs. 30m breakout.', 'High', 5, '30m', 'Overlap'),
(acc_id, 'EURUSD', 'win', 180.00, 1.8, 1.0, 'short', '2025-10-22', 'ECB dovish.', 'High', 4, '15m', 'London'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-10-24', 'Yen weakness. Wrong side.', 'Medium', 2, '5m', 'Overlap'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 1.0, 'long', '2025-10-27', 'Big tech earnings week.', 'High', 5, '15m', 'New York'),
(acc_id, 'US30', 'win', 220.00, 2.2, 1.0, 'long', '2025-10-29', 'Indices strong month end.', 'High', 4, '15m', 'New York'),
(acc_id, 'XAUUSD', 'win', 250.00, 2.5, 1.0, 'long', '2025-10-31', 'Halloween gold rally.', 'High', 4, '30m', 'Overlap'),

-- ==================== NOVEMBER 2025 (13 trades) ====================
-- Election volatility then rally.
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-11-03', 'Dollar strength pre-election.', 'High', 4, '15m', 'London'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-11-05', 'Election volatility. Got stopped.', 'Medium', 2, '5m', 'London'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 1.0, 'long', '2025-11-07', 'Post-election gold rally.', 'High', 5, '30m', 'Overlap'),
(acc_id, 'NAS100', 'win', 280.00, 2.8, 1.0, 'long', '2025-11-10', 'Post-election tech rally.', 'High', 4, '15m', 'New York'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-11-12', 'Dollar still strong. Wrong direction.', 'Medium', 2, '5m', 'Asian'),
(acc_id, 'GBPJPY', 'win', 300.00, 3.0, 1.0, 'long', '2025-11-14', 'Risk-on continuing.', 'High', 5, '30m', 'Overlap'),
(acc_id, 'US30', 'win', 250.00, 2.5, 1.0, 'long', '2025-11-17', 'Indices rally.', 'High', 4, '15m', 'New York'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-11-19', 'Euro weak. Dollar strength.', 'Medium', 2, '5m', 'London'),
(acc_id, 'XAUUSD', 'win', 850.00, 8.5, 1.0, 'long', '2025-11-21', 'Gold geopolitical bid. 8.5R MONSTER! Best of year!', 'High', 5, '30m', 'Overlap'),
(acc_id, 'GBPUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-11-24', 'Cable weakness.', 'High', 4, '15m', 'London'),
(acc_id, 'NAS100', 'win', 220.00, 2.2, 1.0, 'long', '2025-11-26', 'Black Friday optimism.', 'High', 4, '15m', 'New York'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'long', '2025-11-27', 'Thanksgiving liquidity. Dollar bid.', 'High', 4, '15m', 'Asian'),
(acc_id, 'XAUUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-11-28', 'Tried to short gold. Never short trend.', 'Low', 1, '5m', 'Overlap'),

-- ==================== DECEMBER 2025 (13 trades) ====================
-- Strong year end.
(acc_id, 'GBPJPY', 'win', 280.00, 2.8, 1.0, 'long', '2025-12-01', 'December starting strong.', 'High', 4, '30m', 'Overlap'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-12-03', 'Euro weak into year end.', 'Medium', 2, '5m', 'London'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 1.0, 'long', '2025-12-05', 'Gold year-end buying.', 'High', 5, '30m', 'Overlap'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 1.0, 'long', '2025-12-08', 'Santa rally starting.', 'High', 5, '15m', 'New York'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 1.0, 'short', '2025-12-10', 'Tried to short Santa rally. Bad.', 'Low', 1, '5m', 'New York'),
(acc_id, 'GBPUSD', 'win', 600.00, 6.0, 1.0, 'long', '2025-12-12', 'UK data beat. 6R beauty!', 'High', 5, '30m', 'London'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'long', '2025-12-15', 'Dollar strength into year end.', 'High', 4, '15m', 'Asian'),
(acc_id, 'XAUUSD', 'win', 280.00, 2.8, 1.0, 'long', '2025-12-17', 'Gold FOMC bid.', 'High', 4, '30m', 'Overlap'),
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-12-19', 'ECB dovish. Euro weakness.', 'High', 4, '15m', 'London'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'long', '2025-12-22', 'Holiday thin liquidity.', 'Medium', 2, '5m', 'New York'),
(acc_id, 'GBPJPY', 'win', 250.00, 2.5, 1.0, 'long', '2025-12-24', 'Christmas Eve risk-on.', 'High', 4, '30m', 'Overlap'),
(acc_id, 'XAUUSD', 'win', 300.00, 3.0, 1.0, 'long', '2025-12-29', 'Year end gold strength.', 'High', 4, '30m', 'Overlap'),
(acc_id, 'US30', 'win', 220.00, 2.2, 1.0, 'long', '2025-12-31', 'Final trade. NYE rally. Great year!', 'High', 5, '15m', 'New York');

END $$;

-- VERIFICATION QUERY:
-- SELECT COUNT(*) as total, SUM(CASE WHEN outcome='win' THEN 1 ELSE 0 END) as wins,
--   ROUND(100.0 * SUM(CASE WHEN outcome='win' THEN 1 ELSE 0 END) / COUNT(*), 1) as winrate,
--   SUM(pnl) as total_pnl FROM trades WHERE account_id = '615da27e-d788-4a5f-902d-df1ab836ae14';
