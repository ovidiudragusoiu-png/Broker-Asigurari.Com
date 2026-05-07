import unittest

from portfolio_monitor.calculations import (
    buy_trade_size,
    calculate_position_metrics,
    gradual_trim_fraction,
    position_weight,
    sell_trade_size,
)
from portfolio_monitor.models import PortfolioPosition, Quote


class PositionWeightTests(unittest.TestCase):
    def test_position_weight(self):
        self.assertAlmostEqual(position_weight(35_000, 100_000), 0.35)

    def test_calculate_position_metrics_uses_live_prices(self):
        positions = [
            PortfolioPosition(ticker="AMD", company="AMD", shares=10, current_price=90, market_value=900),
            PortfolioPosition(ticker="AVGO", company="Broadcom", shares=2, current_price=100, market_value=200),
        ]
        quotes = {
            "AMD": Quote(ticker="AMD", source_symbol="AMD", price=100, previous_close=95, source="test"),
            "AVGO": Quote(ticker="AVGO", source_symbol="AVGO", price=200, previous_close=200, source="test"),
        }

        metrics = calculate_position_metrics(positions, quotes)

        self.assertAlmostEqual(metrics["AMD"].market_value, 1_000)
        self.assertAlmostEqual(metrics["AMD"].weight, 1_000 / 1_400)
        self.assertTrue(metrics["AMD"].price_available)
        self.assertAlmostEqual(metrics["AMD"].daily_gain_loss, 50)

    def test_unavailable_price_does_not_size_market_value_without_fallback(self):
        positions = [PortfolioPosition(ticker="AMD", company="AMD", shares=10, market_value=900)]
        quotes = {"AMD": Quote(ticker="AMD", source_symbol="AMD", price=None)}

        metrics = calculate_position_metrics(positions, quotes, allow_snapshot_fallback=False)

        self.assertIsNone(metrics["AMD"].market_value)
        self.assertIsNone(metrics["AMD"].weight)
        self.assertFalse(metrics["AMD"].price_available)

    def test_snapshot_fallback_is_explicit(self):
        positions = [PortfolioPosition(ticker="AMD", company="AMD", shares=10, market_value=900)]
        quotes = {"AMD": Quote(ticker="AMD", source_symbol="AMD", price=None)}

        metrics = calculate_position_metrics(positions, quotes, allow_snapshot_fallback=True)

        self.assertEqual(metrics["AMD"].market_value, 900)
        self.assertEqual(metrics["AMD"].weight, 1)
        self.assertEqual(metrics["AMD"].value_source, "portfolio_snapshot")


class TradeSizingTests(unittest.TestCase):
    def test_sell_trade_size(self):
        shares, dollars = sell_trade_size(shares=580.2, price=414.05, sell_fraction_of_position=0.05)

        self.assertAlmostEqual(shares, 29.01)
        self.assertAlmostEqual(dollars, 12_012.10725)

    def test_sell_trade_size_omits_dollars_without_price(self):
        shares, dollars = sell_trade_size(shares=100, price=None, sell_fraction_of_position=0.10)

        self.assertEqual(shares, 10)
        self.assertIsNone(dollars)

    def test_buy_trade_size(self):
        shares, dollars = buy_trade_size(
            portfolio_value=339_505,
            price=100,
            buy_fraction_of_portfolio=0.03,
        )

        self.assertAlmostEqual(dollars, 10_185.15)
        self.assertAlmostEqual(shares, 101.8515)

    def test_buy_trade_size_omits_shares_without_price(self):
        shares, dollars = buy_trade_size(
            portfolio_value=339_505,
            price=None,
            buy_fraction_of_portfolio=0.03,
        )

        self.assertIsNone(shares)
        self.assertAlmostEqual(dollars, 10_185.15)

    def test_gradual_trim_fraction_scales_with_concentration_gap(self):
        fraction = gradual_trim_fraction(
            current_weight=0.70,
            target_weight=0.35,
            default_fraction=0.05,
        )

        self.assertAlmostEqual(fraction, 0.125)


if __name__ == "__main__":
    unittest.main()
