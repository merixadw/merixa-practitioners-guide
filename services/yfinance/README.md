# Merixa yfinance service

Python retrieves and prepares dated financial statements; Tutor performs analysis.
Only public company search terms and listing identifiers reach this service.
It accepts no uploaded documents, chat histories, arbitrary URLs or executable code.

## Render Free test deployment

Use Python 3, root directory `services/yfinance`, build command
`pip install -r requirements.txt`, start command `python service.py`,
health check `/health`, region Frankfurt, and **Free** instance.
Set `HOST=0.0.0.0` and a private `YFINANCE_SERVICE_TOKEN` of at least 32 characters.
The Blueprint in `render.yaml` generates a secret automatically. Keep auto-deploy off.
Never commit the token. Configure that same token as a Cloudflare Tutor Worker secret,
and set `YFINANCE_SERVICE_URL` to the verified HTTPS Render service URL.

Render Free sleeps after 15 idle minutes and may take about a minute to wake.
It has usage limits and is for testing, not assured production availability.
Do not add a payment method or select a paid compute/workspace plan for this test setup.
Tutor falls back to funded OpenAI web retrieval when this service is unavailable.

## Behaviour

`GET /health` returns service metadata. Authenticated `POST /v1/company` supports:

```json
{"action":"search","query":"Toyota"}
```

```json
{"action":"statements","symbol":"7203.T","exchange":"JPX","period":"annual"}
```

`quarter` is also supported. Results preserve Yahoo field labels, nulls, reporting
currency, listing identity and retrieval time. Search cache: five minutes;
statement cache: one hour. Upstream work: 30-second deadline, one request at a time.
Body limit: 2 KB. Returned JSON: 500 KB. Failed lookups are not cached.

Run `python -m unittest discover -s services/yfinance -p test_service.py -v`
from the repository root after installing the requirements.

The optional Cloudflare Container configuration is retained for future use.
It requires Workers Paid and is **not** the approved test-hosting choice.
yfinance is unofficial; its software licence does not grant rights to Yahoo data.
