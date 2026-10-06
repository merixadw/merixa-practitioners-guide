"""Bounded yfinance service for Merixa. Accepts company queries, never files/prompts."""
import datetime as dt
import hmac
import json
import math
import numbers
import os
import re
import signal
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

for key in ('OPENBLAS_NUM_THREADS', 'OMP_NUM_THREADS', 'MKL_NUM_THREADS'):
    os.environ[key] = '1'
SYMBOL = re.compile(r'^[A-Z0-9][A-Z0-9.^=\-]{0,23}$')
CACHE = {}


def clean(value):
    return str(value)[:180] if value is not None else None


def frame_records(frame, currency):
    result = []
    for column in list(frame.columns)[:5]:
        values = {}
        for label, row in frame.iloc[:256].iterrows():
            value = row[column]
            values[str(label)[:160]] = float(value) if isinstance(value, numbers.Real) and math.isfinite(float(value)) else None
        result.append({'date': column.isoformat()[:10], 'reportedCurrency': currency, 'values': values})
    return result


def validate(args):
    if not isinstance(args, dict) or args.get('action') not in ('search', 'statements'):
        raise ValueError('Invalid action')
    if set(args) - {'action', 'query', 'symbol', 'exchange', 'period'}:
        raise ValueError('Unexpected input fields')
    if args['action'] == 'search':
        query = args.get('query')
        if not isinstance(query, str) or not 2 <= len(query.strip()) <= 100 or re.search(r'[\x00-\x1f]', query):
            raise ValueError('Invalid query')
        return {'action': 'search', 'query': query.strip()}
    symbol = args.get('symbol', '')
    exchange = args.get('exchange', '')
    if not isinstance(symbol, str) or not SYMBOL.fullmatch(symbol.upper()) or args.get('period') not in ('annual', 'quarter'):
        raise ValueError('Invalid symbol or period')
    if not isinstance(exchange, str) or len(exchange) > 80:
        raise ValueError('Invalid exchange')
    return {'action': 'statements', 'symbol': symbol.upper(), 'period': args['period'], 'exchange': exchange}


def company_data(args, provider=None):
    args = validate(args)
    if provider is None:
        import yfinance as provider
        provider.config.network.retries = 0
        # Yahoo may reject hosting-provider requests. Preserve that failure
        # instead of allowing yfinance to turn it into an empty company.
        provider.config.debug.hide_exceptions = False
    retrieved = dt.datetime.now(dt.timezone.utc).isoformat()
    if args['action'] == 'search':
        rows = provider.Search(args['query'], max_results=8, news_count=0).quotes
        matches = [{'symbol': r['symbol'], 'name': clean(r.get('longname') or r.get('shortname')),
                    'exchange': clean(r.get('exchange')), 'currency': clean(r.get('currency'))}
                   for r in rows[:8] if SYMBOL.fullmatch(str(r.get('symbol', ''))) and r.get('quoteType') == 'EQUITY']
        return {'status': 'ok' if matches else 'not_found', 'provider': 'yfinance-yahoo', 'retrievedAt': retrieved,
                'matches': matches, 'sourceUrl': 'https://finance.yahoo.com/',
                'instruction': 'Confirm company, exchange/listing and currency if ambiguous. Do not silently select an ADR or similarly named issuer.'}
    symbol = args['symbol']
    ticker = provider.Ticker(symbol)
    info = ticker.get_info()
    if not info or not info.get('quoteType'):
        return {'status': 'unavailable', 'provider': 'yfinance-yahoo',
                'code': 'YFINANCE_METADATA_UNAVAILABLE', 'retrievedAt': retrieved}
    if info.get('quoteType') != 'EQUITY':
        return {'status': 'not_found', 'provider': 'yfinance-yahoo', 'symbol': symbol, 'retrievedAt': retrieved}
    actual_symbol = str(info.get('symbol') or symbol).upper()
    exchange = clean(info.get('exchange'))
    if actual_symbol != symbol or args['exchange'] and args['exchange'].upper() != str(exchange).upper():
        return {'status': 'listing_mismatch', 'symbol': symbol, 'actualSymbol': actual_symbol, 'actualExchange': exchange}
    currency = clean(info.get('financialCurrency'))
    prefix = 'quarterly_' if args['period'] == 'quarter' else ''
    statements = {key: frame_records(getattr(ticker, prefix + attribute), currency)
                  for key, attribute in [('income-statement', 'income_stmt'), ('balance-sheet-statement', 'balance_sheet'), ('cash-flow-statement', 'cashflow')]}
    missing = [key for key, periods in statements.items()
               if not any(value is not None for period in periods for value in period['values'].values())]
    return {'status': 'ok' if any(statements.values()) else 'not_found', 'provider': 'yfinance-yahoo', 'retrievedAt': retrieved,
            'company': {'symbol': symbol, 'name': clean(info.get('longName')), 'exchange': exchange,
                        'tradingCurrency': clean(info.get('currency')), 'reportingCurrency': currency},
            'periodRequested': args['period'], 'statements': statements,
            'missingStatements': missing,
            'sourceUrl': 'https://finance.yahoo.com/quote/' + symbol + '/financials/',
            'notes': ['Latest available reported statements from Yahoo through yfinance; not guaranteed latest filings or real-time prices.',
                      'Original statement labels retained. Missing values are null. No currency conversion or scale inference.',
                      'Align periods, reporting currency, units and sign conventions before calculation. Quarterly flows are not annual or TTM.']}


def cached_data(args):
    checked = validate(args)
    key = json.dumps(checked, sort_keys=True)
    now = time.time()
    saved = CACHE.get(key)
    if saved and saved[0] > now:
        return {**saved[1], 'cache': {'hit': True, 'expiresAt': dt.datetime.fromtimestamp(saved[0], dt.timezone.utc).isoformat()}}
    result = company_data(checked)
    if result.get('status') == 'ok':
        if len(CACHE) >= 128:
            CACHE.pop(next(iter(CACHE)))
        CACHE[key] = (now + (300 if checked['action'] == 'search' else 3600), result)
    return result


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # Do not log credentials, request bodies or company queries.

    def respond(self, status, value):
        encoded = json.dumps(value, allow_nan=False).encode()
        if len(encoded) > 500_000:
            status, encoded = 502, b'{"status":"unavailable","code":"DATA_LIMIT"}'
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(encoded)))
        self.send_header('Cache-Control', 'private, no-store')
        self.end_headers()
        try:
            self.wfile.write(encoded)
        except (BrokenPipeError, ConnectionResetError):
            pass  # The caller timed out or disconnected; do not respond twice.

    def do_GET(self):
        self.respond(200 if self.path == '/health' else 404, {'service': 'merixa-yfinance', 'version': '1'})

    def do_POST(self):
        token = os.environ.get('YFINANCE_SERVICE_TOKEN', '')
        if len(token) < 32 or not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token):
            return self.respond(401, {'status': 'unavailable'})
        if self.path != '/v1/company' or self.headers.get('Transfer-Encoding'):
            return self.respond(400, {'status': 'error', 'code': 'INVALID_REQUEST'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 2048:
                raise ValueError()
            self.connection.settimeout(10)
            args = json.loads(self.rfile.read(size))
            validate(args)
        except (ValueError, OSError):
            return self.respond(400, {'status': 'error', 'code': 'INVALID_REQUEST'})
        try:
            signal.alarm(30)
            self.respond(200, cached_data(args))
        except Exception:
            self.respond(503, {'status': 'unavailable', 'code': 'YFINANCE_UNAVAILABLE',
                               'message': 'Yahoo data is temporarily unavailable. No current figures were retrieved.'})
        finally:
            signal.alarm(0)


if __name__ == '__main__':
    if len(os.environ.get('YFINANCE_SERVICE_TOKEN', '')) < 32:
        raise SystemExit('Set a server-only YFINANCE_SERVICE_TOKEN of at least 32 characters.')
    def timeout(_signum, _frame):
        raise TimeoutError('Upstream deadline')
    signal.signal(signal.SIGALRM, timeout)
    # Sequential processing bounds memory and Yahoo request concurrency.
    HTTPServer((os.environ.get('HOST', '127.0.0.1'), int(os.environ.get('PORT', '8080'))), Handler).serve_forever()
