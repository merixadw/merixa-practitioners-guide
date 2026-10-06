import datetime as dt
import unittest
from unittest.mock import Mock, patch
import pandas as pd
import service


class CompanyDataTests(unittest.TestCase):
    def setUp(self):
        service.CACHE.clear()
        self.frame = pd.DataFrame({pd.Timestamp('2026-03-31'): [120, float('nan'), float('inf'), 0]},
                                  index=['Total Revenue', 'Net Income', 'Invalid', 'Zero'])
        self.ticker = Mock(income_stmt=self.frame, balance_sheet=self.frame, cashflow=self.frame)
        self.ticker.get_info.return_value = {'symbol':'7203.T','quoteType':'EQUITY','exchange':'JPX',
                                             'longName':'Toyota fixture','currency':'JPY','financialCurrency':'JPY'}
        self.provider = Mock()
        self.provider.Ticker.return_value = self.ticker
        self.args = {'action':'statements','symbol':'7203.T','exchange':'JPX','period':'annual'}

    def test_missing_values_not_invented(self):
        result = service.company_data(self.args,self.provider)
        period = result['statements']['income-statement'][0]
        self.assertEqual(period['reportedCurrency'],'JPY')
        self.assertEqual(period['values']['Total Revenue'],120)
        self.assertIsNone(period['values']['Net Income'])
        self.assertIsNone(period['values']['Invalid'])
        self.assertEqual(period['values']['Zero'],0)
        self.assertEqual(result['missingStatements'],[])

    def test_listing_mismatch(self):
        result = service.company_data({**self.args,'exchange':'LSE'},self.provider)
        self.assertEqual(result['status'],'listing_mismatch')
        self.assertNotIn('statements',result)

    def test_partial_statements_are_identified(self):
        self.ticker.balance_sheet = pd.DataFrame()
        result = service.company_data(self.args,self.provider)
        self.assertEqual(result['missingStatements'],['balance-sheet-statement'])

    def test_closed_input_and_symbols(self):
        for args in [None,{}, {'action':'search','query':'x'}, {**self.args,'url':'https://evil.test'},
                     {**self.args,'symbol':'../../etc/passwd'}, {**self.args,'period':'guess'}]:
            with self.assertRaises(ValueError): service.validate(args)

    def test_cache_preserves_source_time(self):
        with patch('service.company_data',return_value={'status':'ok','retrievedAt':'2026-10-06T00:00:00Z'}) as fetch:
            first = service.cached_data(self.args)
            second = service.cached_data(self.args)
            self.assertEqual(fetch.call_count,1)
            self.assertEqual(first['retrievedAt'],second['retrievedAt'])
            self.assertTrue(second['cache']['hit'])
            with patch('service.time.time',return_value=dt.datetime.now().timestamp()+3601):
                service.cached_data(self.args)
            self.assertEqual(fetch.call_count,2)

    def test_failed_results_are_not_cached(self):
        with patch('service.company_data',return_value={'status':'not_found'}) as fetch:
            service.cached_data(self.args)
            service.cached_data(self.args)
            self.assertEqual(fetch.call_count,2)


if __name__ == '__main__': unittest.main()
