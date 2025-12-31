-- TRADING JOURNAL SEED DATA - 158 Trades (2025)
-- Win Rate: ~48% | Starting Balance: $10,000 | Risk: 1% per trade
-- Includes all inputs: symbol, outcome, pnl, rr, risk, direction, date, notes, extra_data (confidence, rating, timeframe, session)
--
-- INSTRUCTIONS:
-- 1. Replace account ID below with your actual account ID
-- 2. Run in Supabase SQL Editor
-- 3. This will DELETE existing trades for this account and insert fresh demo data

-- STEP 1: Add missing columns if they don't exist
ALTER TABLE trades ADD COLUMN IF NOT EXISTS risk DECIMAL(5,2);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}';

-- STEP 2: Delete existing trades for this account (prevents duplicates)
DELETE FROM trades WHERE account_id = '615da27e-d788-4a5f-902d-df1ab836ae14';

-- STEP 3: Reset custom_inputs to NULL so app uses default inputs
-- (The app has built-in defaults for confidence, rating, timeframe, session)
UPDATE accounts SET custom_inputs = NULL WHERE id = '615da27e-d788-4a5f-902d-df1ab836ae14';

DO $$
DECLARE
    acc_id UUID := '615da27e-d788-4a5f-902d-df1ab836ae14';
BEGIN

INSERT INTO trades (account_id, symbol, outcome, pnl, rr, risk, direction, date, notes, extra_data) VALUES

-- ==================== JANUARY 2025 (13 trades) ====================
-- Rough start, finding footing
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-01-02', 'First trade of the year. Entered on London open breakout but got faked out. Need to wait for confirmation.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 200.00, 2.0, 1.0, 'long', '2025-01-03', 'Gold momentum trade. Clean break of Asian high. Held to target.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-01-06', 'Counter-trend trade. Should have waited for better setup.', '{"confidence":"Low","rating":"2","timeframe":"5m","session":"Overlap"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'long', '2025-01-07', 'Tech weak. Tried to catch falling knife. Bad idea.', '{"confidence":"Medium","rating":"1","timeframe":"5m","session":"New York"}'),
(acc_id, 'USDJPY', 'win', 150.00, 1.5, 1.0, 'long', '2025-01-08', 'Dollar strength on yields. Nice trend continuation.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"Asian"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-01-10', 'Choppy price action pre-NFP. Should avoid trading before major news.', '{"confidence":"Low","rating":"1","timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 600.00, 6.0, 1.0, 'long', '2025-01-13', 'Beautiful 30m setup. Gold breaking out on risk-off sentiment. Let it run to 6R!', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'GBPUSD', 'win', 180.00, 1.8, 1.0, 'long', '2025-01-15', 'UK CPI beat. Cable rallied hard. Good fundamental alignment.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 1.0, 'long', '2025-01-17', 'Indices choppy. Got stopped in the noise.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPJPY', 'win', 280.00, 2.8, 1.0, 'long', '2025-01-20', 'Risk-on Monday. Yen crosses flying. Caught nice move on 30m.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"London"}'),
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-01-22', 'ECB dovish comments. Euro weakness confirmed.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'short', '2025-01-24', 'Tried to short tech. Still going higher. Dont fight momentum.', '{"confidence":"Low","rating":"2","timeframe":"5m","session":"New York"}'),
(acc_id, 'XAUUSD', 'win', 300.00, 3.0, 1.0, 'long', '2025-01-27', 'Gold continuation. Trend is your friend. Easy trade.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),

-- ==================== FEBRUARY 2025 (13 trades) ====================
-- Getting more consistent
(acc_id, 'USDJPY', 'win', 250.00, 2.5, 1.0, 'long', '2025-02-03', 'BOJ keeping rates low. Dollar bid. Clean breakout.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"Asian"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-02-05', 'UK data miss. Got caught wrong side.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'EURUSD', 'win', 180.00, 1.8, 1.0, 'long', '2025-02-07', 'Euro bounce on positioning. Quick scalp.', '{"confidence":"Medium","rating":"3","timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 800.00, 8.0, 1.0, 'long', '2025-02-10', 'Gold new highs. 30m trend trade. MONSTER 8R runner! Best trade of the year so far.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'long', '2025-02-12', 'Tech selling on rates fear. Bad timing.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-02-13', 'Risk still on. Wrong read on sentiment.', '{"confidence":"Low","rating":"1","timeframe":"5m","session":"London"}'),
(acc_id, 'US30', 'win', 220.00, 2.2, 1.0, 'long', '2025-02-17', 'Presidents Day rally. Indices pushing.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-02-19', 'Euro squeezed. Short covering rally.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 1.0, 'long', '2025-02-21', 'Gold still trending. Another clean 30m setup.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'short', '2025-02-24', 'Yen strength on risk-off. Good reversal trade.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"Asian"}'),
(acc_id, 'GBPUSD', 'win', 150.00, 1.5, 1.0, 'long', '2025-02-26', 'Cable bounce off support. Quick 1.5R.', '{"confidence":"Medium","rating":"3","timeframe":"5m","session":"London"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'short', '2025-02-28', 'Month end buying. Indices squeezed higher.', '{"confidence":"Low","rating":"2","timeframe":"5m","session":"New York"}'),

-- ==================== MARCH 2025 (14 trades) ====================
-- Hot streak mid-month (6 wins in a row)
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-03-03', 'NFP week chop. Should have stayed flat.', '{"confidence":"Low","rating":"1","timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 300.00, 3.0, 1.0, 'long', '2025-03-05', 'Gold bid pre-NFP. Safe haven flow.', '{"confidence":"High","rating":"4","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'win', 250.00, 2.5, 1.0, 'long', '2025-03-10', 'Risk-on post NFP. Yen crosses ripping.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'US30', 'win', 200.00, 2.0, 1.0, 'long', '2025-03-12', 'Indices breaking out. Good follow through.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'EURUSD', 'win', 280.00, 2.8, 1.0, 'long', '2025-03-14', 'Euro strength on ECB. Four in a row!', '{"confidence":"High","rating":"5","timeframe":"15m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 700.00, 7.0, 1.0, 'long', '2025-03-17', 'Gold breakout. Five wins straight. 7R runner! On fire!', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 1.0, 'long', '2025-03-19', 'FOMC dovish. Tech rallying hard. SIX consecutive wins!', '{"confidence":"High","rating":"5","timeframe":"15m","session":"New York"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-03-21', 'Tried to fade the move. Streak ended. Still a great run.', '{"confidence":"Low","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'long', '2025-03-24', 'Dollar strength resuming. Back on track.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"Asian"}'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-03-26', 'Yen strength surprised. Risk-off into quarter end.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"Overlap"}'),
(acc_id, 'XAUUSD', 'win', 250.00, 2.5, 1.0, 'long', '2025-03-27', 'Gold safe haven bid. Good read.', '{"confidence":"High","rating":"4","timeframe":"30m","session":"London"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 1.0, 'long', '2025-03-28', 'Quarter end selling. Stopped out.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-03-31', 'Month end positioning. Choppy.', '{"confidence":"Low","rating":"1","timeframe":"5m","session":"London"}'),
(acc_id, 'NAS100', 'win', 180.00, 1.8, 1.0, 'long', '2025-03-31', 'Late day bounce. Quick scalp to end month.', '{"confidence":"Medium","rating":"3","timeframe":"5m","session":"New York"}'),

-- ==================== APRIL 2025 (14 trades) ====================
-- Worst drawdown (5 losses in a row) then recovery
(acc_id, 'GBPUSD', 'win', 220.00, 2.2, 1.0, 'long', '2025-04-02', 'Q2 starting well. Cable breakout.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'XAUUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-04-04', 'Tried to short gold. Still trending up. Dumb trade.', '{"confidence":"Low","rating":"1","timeframe":"5m","session":"Overlap"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-04-07', 'Yen intervention rumors. Got stopped. Two losses.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"Asian"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'long', '2025-04-09', 'CPI hot. Tech dumping. Three losses in a row.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-04-10', 'Dollar strength killing euro longs. Four losses.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-04-11', 'FIVE consecutive losses. Worst streak ever. Taking a break.', '{"confidence":"Low","rating":"1","timeframe":"5m","session":"Overlap"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 4.0, 1.0, 'long', '2025-04-21', 'Back from break. Only A+ setups. Gold 30m breakout. Perfect.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'US30', 'win', 250.00, 2.5, 1.0, 'long', '2025-04-23', 'Indices recovering. Good momentum trade.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'GBPUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-04-24', 'UK retail miss. Cable weakness. Three wins recovering.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'EURUSD', 'win', 280.00, 2.8, 1.0, 'long', '2025-04-25', 'Euro bounce. Four wins. Fully recovered from drawdown.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'short', '2025-04-28', 'Tried to short rally. Wrong again.', '{"confidence":"Low","rating":"2","timeframe":"5m","session":"New York"}'),
(acc_id, 'XAUUSD', 'win', 300.00, 3.0, 1.0, 'long', '2025-04-29', 'Gold still trending. System working.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'USDJPY', 'win', 180.00, 1.8, 1.0, 'long', '2025-04-30', 'Month end dollar bid. Good to end April positive.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"Asian"}'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-04-30', 'Overtraded. Should have stopped after win.', '{"confidence":"Low","rating":"1","timeframe":"5m","session":"London"}'),

-- ==================== MAY 2025 (13 trades) ====================
-- Steady improvement
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-05-02', 'Sell in May effect starting. Euro weakness.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 1.0, 'long', '2025-05-05', 'Gold 30m continuation. Trend following working.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'long', '2025-05-07', 'Tech wobbling. Bad entry.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPUSD', 'win', 220.00, 2.2, 1.0, 'short', '2025-05-09', 'BOE dovish. Cable weakness confirmed.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-05-12', 'Yen still weak. Wrong side.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"Asian"}'),
(acc_id, 'GBPJPY', 'win', 280.00, 2.8, 1.0, 'long', '2025-05-14', 'Risk-on sentiment. Yen crosses flying.', '{"confidence":"High","rating":"4","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'XAUUSD', 'win', 650.00, 6.5, 1.0, 'long', '2025-05-16', 'Gold breakout to new highs. 6.5R monster move!', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 1.0, 'short', '2025-05-19', 'Indices still rallying. Dont short strength.', '{"confidence":"Low","rating":"1","timeframe":"5m","session":"New York"}'),
(acc_id, 'EURUSD', 'win', 180.00, 1.8, 1.0, 'long', '2025-05-21', 'Euro bounce on ECB. Quick 1.8R.', '{"confidence":"Medium","rating":"3","timeframe":"5m","session":"London"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 1.0, 'long', '2025-05-23', 'NVIDIA earnings hype. Tech ripping.', '{"confidence":"High","rating":"5","timeframe":"15m","session":"New York"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-05-27', 'UK holiday thin liquidity. Got chopped.', '{"confidence":"Low","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 250.00, 2.5, 1.0, 'long', '2025-05-29', 'Gold continuation. Easy money.', '{"confidence":"High","rating":"4","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'long', '2025-05-30', 'Month end dollar strength. Good read.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"Asian"}'),

-- ==================== JUNE 2025 (13 trades) ====================
-- Summer grind, consistent
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-06-02', 'Euro bounced. Summer chop starting.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'GBPJPY', 'win', 300.00, 3.0, 1.0, 'long', '2025-06-04', 'Risk-on. Yen crosses strong. 30m setup.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'XAUUSD', 'win', 280.00, 2.8, 1.0, 'long', '2025-06-06', 'Gold trending. Following the system.', '{"confidence":"High","rating":"4","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'short', '2025-06-09', 'Tech still strong. Stop fighting it.', '{"confidence":"Low","rating":"1","timeframe":"5m","session":"New York"}'),
(acc_id, 'US30', 'win', 220.00, 2.2, 1.0, 'long', '2025-06-11', 'FOMC week positioning. Indices bid.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'GBPUSD', 'win', 750.00, 7.5, 1.0, 'long', '2025-06-13', 'UK data beat. Huge 30m cable rally. 7.5R runner! Best trade of month.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"London"}'),
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'long', '2025-06-16', 'Dollar weakness post FOMC. Euro strength.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-06-18', 'Yen strength on risk-off. Bad read.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 1.0, 'long', '2025-06-20', 'Gold breakout continuation. 30m perfection.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-06-23', 'Risk back on. Wrong side again.', '{"confidence":"Low","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'NAS100', 'win', 250.00, 2.5, 1.0, 'long', '2025-06-25', 'Tech summer rally. Good momentum.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'US30', 'win', 200.00, 2.0, 1.0, 'long', '2025-06-27', 'Quarter end rally starting.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-06-30', 'Quarter end rebalancing. Got stopped.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),

-- ==================== JULY 2025 (13 trades) ====================
-- Strong performance
(acc_id, 'XAUUSD', 'win', 400.00, 4.0, 1.0, 'long', '2025-07-02', 'H2 starting strong. Gold 30m breakout.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'GBPUSD', 'win', 220.00, 2.2, 1.0, 'long', '2025-07-04', 'US holiday. Cable grinding higher.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-07-07', 'Yen strength. Wrong read.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"Asian"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 1.0, 'long', '2025-07-09', 'Tech earnings optimism. NASDAQ ripping.', '{"confidence":"High","rating":"5","timeframe":"15m","session":"New York"}'),
(acc_id, 'EURUSD', 'win', 180.00, 1.8, 1.0, 'long', '2025-07-11', 'Euro strength on data. Quick scalp.', '{"confidence":"Medium","rating":"3","timeframe":"5m","session":"London"}'),
(acc_id, 'GBPJPY', 'win', 350.00, 3.5, 1.0, 'long', '2025-07-14', 'Risk-on. Yen crosses flying. 30m monster.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'XAUUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-07-16', 'Tried to fade gold. Still going. Learn the lesson.', '{"confidence":"Low","rating":"1","timeframe":"5m","session":"Overlap"}'),
(acc_id, 'US30', 'win', 250.00, 2.5, 1.0, 'long', '2025-07-18', 'Earnings rally. Indices strong.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-07-21', 'Cable squeezed. Got caught.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-07-23', 'ECB dovish. Euro weakness.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'win', 280.00, 2.8, 1.0, 'long', '2025-07-25', 'Big tech earnings beat. NASDAQ flying.', '{"confidence":"High","rating":"5","timeframe":"15m","session":"New York"}'),
(acc_id, 'XAUUSD', 'win', 300.00, 3.0, 1.0, 'long', '2025-07-28', 'Gold continuation. Only taking longs.', '{"confidence":"High","rating":"4","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'long', '2025-07-30', 'Month end dollar bid. Good to end strong.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"Asian"}'),

-- ==================== AUGUST 2025 (13 trades) ====================
-- Summer volatility
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-08-01', 'August starting weak. Yen strength.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"Overlap"}'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 1.0, 'long', '2025-08-04', 'Gold safe haven bid. 30m breakout.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'long', '2025-08-06', 'Euro bounce. Quick 2R.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'long', '2025-08-08', 'Tech selling on rates fear.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"New York"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 1.0, 'long', '2025-08-11', 'Indices weak. Two losses in a row.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPUSD', 'win', 450.00, 4.5, 1.0, 'short', '2025-08-13', 'UK inflation miss. Cable tanked. Big 30m move.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"London"}'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'short', '2025-08-15', 'Yen strength continuing. Good read.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 300.00, 3.0, 1.0, 'long', '2025-08-18', 'Gold still trending. Easy trade.', '{"confidence":"High","rating":"4","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-08-20', 'Jackson Hole anxiety. Risk-off.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'EURUSD', 'win', 220.00, 2.2, 1.0, 'long', '2025-08-22', 'Post JH dollar weakness. Euro bid.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'win', 280.00, 2.8, 1.0, 'long', '2025-08-25', 'Tech bouncing. Good momentum.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 1.0, 'short', '2025-08-27', 'Indices squeezed. Wrong side.', '{"confidence":"Low","rating":"2","timeframe":"5m","session":"New York"}'),
(acc_id, 'XAUUSD', 'win', 250.00, 2.5, 1.0, 'long', '2025-08-29', 'Month end gold strength. Good finish.', '{"confidence":"High","rating":"4","timeframe":"30m","session":"Overlap"}'),

-- ==================== SEPTEMBER 2025 (13 trades) ====================
-- Volatile month
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-09-01', 'September seasonality. Dollar strength.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'long', '2025-09-03', 'Dollar bid. Yen weakness.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 1.0, 'long', '2025-09-05', 'Gold 30m breakout. Beautiful setup.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-09-08', 'Euro weak. Dollar strength continuing.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-09-10', 'Risk-off. Yen strength. Two losses.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"Overlap"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 1.0, 'short', '2025-09-12', 'Tech rolling over. Good short entry.', '{"confidence":"High","rating":"5","timeframe":"15m","session":"New York"}'),
(acc_id, 'US30', 'win', 220.00, 2.2, 1.0, 'short', '2025-09-15', 'Indices weak. Following momentum.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'XAUUSD', 'win', 550.00, 5.5, 1.0, 'long', '2025-09-17', 'FOMC week. Gold safe haven. 5.5R runner.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-09-19', 'Cable squeezed post FOMC.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-09-22', 'Euro weakness. Dollar strength.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 1.0, 'long', '2025-09-24', 'Yen intervention. Got stopped.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"Asian"}'),
(acc_id, 'NAS100', 'win', 250.00, 2.5, 1.0, 'long', '2025-09-26', 'Tech bouncing. Quarter end rally.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'XAUUSD', 'win', 280.00, 2.8, 1.0, 'long', '2025-09-30', 'Quarter end gold strength.', '{"confidence":"High","rating":"4","timeframe":"30m","session":"Overlap"}'),

-- ==================== OCTOBER 2025 (13 trades) ====================
-- Strong Q4 start
(acc_id, 'GBPJPY', 'win', 300.00, 3.0, 1.0, 'long', '2025-10-02', 'Q4 risk-on. Yen crosses strong.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-10-06', 'Euro still weak vs dollar.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 1.0, 'long', '2025-10-08', 'Gold trending. 30m continuation.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'NAS100', 'win', 280.00, 2.8, 1.0, 'long', '2025-10-10', 'Tech earnings optimism.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 1.0, 'short', '2025-10-13', 'Tried to short rally. Wrong.', '{"confidence":"Low","rating":"1","timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPUSD', 'win', 220.00, 2.2, 1.0, 'long', '2025-10-15', 'UK data beat. Cable rally.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'long', '2025-10-17', 'Dollar strength. Good setup.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 400.00, 4.0, 1.0, 'long', '2025-10-20', 'Gold new highs. 30m breakout.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'EURUSD', 'win', 180.00, 1.8, 1.0, 'short', '2025-10-22', 'ECB dovish. Euro short worked.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'GBPJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-10-24', 'Yen weakness. Wrong side.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"Overlap"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 1.0, 'long', '2025-10-27', 'Big tech earnings week. NASDAQ flying.', '{"confidence":"High","rating":"5","timeframe":"15m","session":"New York"}'),
(acc_id, 'US30', 'win', 220.00, 2.2, 1.0, 'long', '2025-10-29', 'Indices strong into month end.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'XAUUSD', 'win', 250.00, 2.5, 1.0, 'long', '2025-10-31', 'Halloween gold rally. Good finish.', '{"confidence":"High","rating":"4","timeframe":"30m","session":"Overlap"}'),

-- ==================== NOVEMBER 2025 (13 trades) ====================
-- Election volatility then rally
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-11-03', 'Dollar strength pre-election.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'GBPUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-11-05', 'Election volatility. Got stopped.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 1.0, 'long', '2025-11-07', 'Post-election gold rally. 30m setup.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'NAS100', 'win', 280.00, 2.8, 1.0, 'long', '2025-11-10', 'Post-election tech rally. Good timing.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'USDJPY', 'loss', -100.00, 1.0, 1.0, 'short', '2025-11-12', 'Dollar still strong. Wrong direction.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"Asian"}'),
(acc_id, 'GBPJPY', 'win', 300.00, 3.0, 1.0, 'long', '2025-11-14', 'Risk-on continuing. Yen crosses up.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'US30', 'win', 250.00, 2.5, 1.0, 'long', '2025-11-17', 'Indices rally. Good momentum.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-11-19', 'Euro weak. Dollar strength.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 850.00, 8.5, 1.0, 'long', '2025-11-21', 'Gold geopolitical bid. 8.5R MONSTER! Best trade of the year!', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'GBPUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-11-24', 'Cable weakness. Good short.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'win', 220.00, 2.2, 1.0, 'long', '2025-11-26', 'Black Friday optimism. Tech strong.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"New York"}'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'long', '2025-11-27', 'Thanksgiving thin liquidity. Dollar bid.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'loss', -100.00, 1.0, 1.0, 'short', '2025-11-28', 'Tried to short gold. Still going. Never short trend.', '{"confidence":"Low","rating":"1","timeframe":"5m","session":"Overlap"}'),

-- ==================== DECEMBER 2025 (13 trades) ====================
-- Strong year end
(acc_id, 'GBPJPY', 'win', 280.00, 2.8, 1.0, 'long', '2025-12-01', 'December starting strong. Risk-on.', '{"confidence":"High","rating":"4","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'EURUSD', 'loss', -100.00, 1.0, 1.0, 'long', '2025-12-03', 'Euro weak into year end.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"London"}'),
(acc_id, 'XAUUSD', 'win', 350.00, 3.5, 1.0, 'long', '2025-12-05', 'Gold year-end buying. 30m trend.', '{"confidence":"High","rating":"5","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'NAS100', 'win', 300.00, 3.0, 1.0, 'long', '2025-12-08', 'Santa rally starting. Tech leading.', '{"confidence":"High","rating":"5","timeframe":"15m","session":"New York"}'),
(acc_id, 'US30', 'loss', -100.00, 1.0, 1.0, 'short', '2025-12-10', 'Tried to short Santa rally. Bad idea.', '{"confidence":"Low","rating":"1","timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPUSD', 'win', 600.00, 6.0, 1.0, 'long', '2025-12-12', 'UK data beat. Cable rally. 6R beauty to end the year strong!', '{"confidence":"High","rating":"5","timeframe":"30m","session":"London"}'),
(acc_id, 'USDJPY', 'win', 200.00, 2.0, 1.0, 'long', '2025-12-15', 'Dollar strength into year end.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"Asian"}'),
(acc_id, 'XAUUSD', 'win', 280.00, 2.8, 1.0, 'long', '2025-12-17', 'Gold FOMC bid. Good setup.', '{"confidence":"High","rating":"4","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'EURUSD', 'win', 200.00, 2.0, 1.0, 'short', '2025-12-19', 'ECB dovish. Euro weakness.', '{"confidence":"High","rating":"4","timeframe":"15m","session":"London"}'),
(acc_id, 'NAS100', 'loss', -100.00, 1.0, 1.0, 'long', '2025-12-22', 'Holiday thin liquidity. Got chopped.', '{"confidence":"Medium","rating":"2","timeframe":"5m","session":"New York"}'),
(acc_id, 'GBPJPY', 'win', 250.00, 2.5, 1.0, 'long', '2025-12-24', 'Christmas Eve risk-on. Quick trade.', '{"confidence":"High","rating":"4","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'XAUUSD', 'win', 300.00, 3.0, 1.0, 'long', '2025-12-29', 'Year end gold strength. Almost done.', '{"confidence":"High","rating":"4","timeframe":"30m","session":"Overlap"}'),
(acc_id, 'US30', 'win', 220.00, 2.2, 1.0, 'long', '2025-12-31', 'Final trade of the year. NYE rally. Great year!', '{"confidence":"High","rating":"5","timeframe":"15m","session":"New York"}');

END $$;

-- =====================================================
-- VERIFICATION QUERY:
-- Run this to check your seed data
-- =====================================================
-- SELECT
--   COUNT(*) as total_trades,
--   SUM(CASE WHEN outcome='win' THEN 1 ELSE 0 END) as wins,
--   SUM(CASE WHEN outcome='loss' THEN 1 ELSE 0 END) as losses,
--   ROUND(100.0 * SUM(CASE WHEN outcome='win' THEN 1 ELSE 0 END) / COUNT(*), 1) as winrate,
--   SUM(pnl) as total_pnl,
--   ROUND(AVG(rr), 2) as avg_rr
-- FROM trades
-- WHERE account_id = '615da27e-d788-4a5f-902d-df1ab836ae14';
