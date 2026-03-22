# x402 & AI Payments

## What is x402?

x402 is a payment protocol built on the HTTP 402 "Payment Required" status code. The flow:

1. Client requests a resource/API endpoint
2. Server responds with `402` + payment details (amount, currency, address)
3. Client pays (typically USDC or stablecoins on Base/onchain)
4. Client retries the request with proof of payment
5. Server verifies and fulfills

Designed for machine-to-machine payments — AI agents autonomously paying for resources, tools, and APIs without human intervention. Coinbase/Base have been prominent in pushing it.

## Idea: Put essays behind x402

Essays on this site could be made available through x402 via a thin serverless proxy:

1. Keep essays on GitHub Pages as normal
2. Deploy a Cloudflare Worker that:
   - Intercepts requests to essay URLs
   - Returns `402` + payment details if no valid payment header present
   - Verifies payment via Coinbase's x402 facilitator service
   - Fetches and returns essay content on success

```
reader → Cloudflare Worker → 402 (pay X USDC on Base)
reader pays → retries with X-PAYMENT header
Worker → Coinbase facilitator (verify) → fetches essay → returns content
```

Cloudflare Workers free tier covers this easily.

## UX Considerations

**For AI agents**: seamless. An agent with a crypto wallet handles the 402 automatically, pays, retries. No friction — this is x402's sweet spot.

**For human readers in a browser**: currently rough. Browsers don't natively handle 402 payment flows. Would need either:
- A wallet browser extension that understands x402 (doesn't exist in mainstream form yet)
- A custom HTML payment page returned by the Worker with a wallet connect button

## The scraping question

Nothing currently stops AI bots from scraping freely — GPTBot, ClaudeBot etc. already crawl sites, and `robots.txt` is honor system only. x402 wouldn't *prevent* scraping.

The value proposition is different: creating a **legitimate, monetizable, authorized channel** for AI consumption — agents that want real-time, on-demand access rather than stale crawled data.

## Framing

A natural positioning: **free for humans to read, costs agents to consume.**

The x402 layer is additive — humans access essays normally, while AI agents that want to programmatically consume content pay for authorized access.
