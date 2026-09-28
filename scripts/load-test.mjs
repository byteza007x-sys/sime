#!/usr/bin/env node

import http from "node:http";
import https from "node:https";

const DEFAULT_TARGET = "http://10.10.1.8:3000/api/health";
const DEFAULT_CONCURRENCY = 100;
const DEFAULT_DURATION_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 10_000;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const config = {
    target: process.env.LOAD_TEST_URL || DEFAULT_TARGET,
    concurrency: Number(process.env.LOAD_TEST_CONCURRENCY || DEFAULT_CONCURRENCY),
    durationMs: Number(process.env.LOAD_TEST_DURATION_MS || DEFAULT_DURATION_MS),
    timeoutMs: Number(process.env.LOAD_TEST_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    cookie: process.env.LOAD_TEST_COOKIE || "",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (!next) continue;

    if (arg === "--url") {
      config.target = next;
      index += 1;
    } else if (arg === "--concurrency" || arg === "-c") {
      config.concurrency = Number(next);
      index += 1;
    } else if (arg === "--duration" || arg === "-d") {
      config.durationMs = Number(next) * 1000;
      index += 1;
    } else if (arg === "--timeout") {
      config.timeoutMs = Number(next) * 1000;
      index += 1;
    } else if (arg === "--cookie") {
      config.cookie = next;
      index += 1;
    }
  }

  return config;
};

const printHelp = () => {
  console.log(`
Usage:
  npm run load:test -- --url http://10.10.1.8:3000/api/health -c 100 -d 30

Options:
  --url <url>            Target URL. Default: ${DEFAULT_TARGET}
  -c, --concurrency <n>  Simulated concurrent requests. Default: ${DEFAULT_CONCURRENCY}
  -d, --duration <sec>   Test duration in seconds. Default: 30
  --timeout <sec>        Request timeout in seconds. Default: 10
  --cookie <cookie>      Optional Cookie header for logged-in pages.

Examples:
  npm run load:test -- --url http://10.10.1.8:3000/api/health -c 1000 -d 30
  npm run load:test -- --url "http://10.10.1.8:3000/reports?lang=th" -c 100 -d 30
  npm run load:test -- --url "http://10.10.1.8:3000/dashboard?lang=th" -c 100 -d 30 --cookie "siamebu_session=..."
`);
};

const percentile = (values, fraction) =>
  values[Math.min(values.length - 1, Math.floor(values.length * fraction))] || 0;

const requestOnce = ({ url, timeoutMs, cookie }) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const transport = url.protocol === "https:" ? https : http;
    const request = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: "GET",
        timeout: timeoutMs,
        headers: cookie ? { Cookie: cookie } : undefined,
      },
      (response) => {
        response.resume();
        response.on("end", () => {
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 400,
            statusCode: response.statusCode,
            latencyMs: Date.now() - startedAt,
          });
        });
      },
    );

    request.on("timeout", () => {
      request.destroy();
      resolve({
        ok: false,
        statusCode: "timeout",
        latencyMs: Date.now() - startedAt,
      });
    });

    request.on("error", () => {
      resolve({
        ok: false,
        statusCode: "error",
        latencyMs: Date.now() - startedAt,
      });
    });

    request.end();
  });

const main = async () => {
  const config = parseArgs();
  const url = new URL(config.target);

  if (
    !Number.isFinite(config.concurrency) ||
    config.concurrency < 1 ||
    !Number.isFinite(config.durationMs) ||
    config.durationMs < 1000
  ) {
    console.error("Invalid --concurrency or --duration value.");
    process.exit(1);
  }

  let stop = false;
  let done = 0;
  let ok = 0;
  let err = 0;
  const latencies = [];
  const statuses = new Map();

  console.log(
    JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        target: url.href,
        concurrency: config.concurrency,
        durationSec: config.durationMs / 1000,
        timeoutSec: config.timeoutMs / 1000,
        hasCookie: Boolean(config.cookie),
      },
      null,
      2,
    ),
  );

  setTimeout(() => {
    stop = true;
  }, config.durationMs);

  const loop = async () => {
    while (!stop) {
      const result = await requestOnce({
        url,
        timeoutMs: config.timeoutMs,
        cookie: config.cookie,
      });

      done += 1;
      latencies.push(result.latencyMs);
      statuses.set(result.statusCode, (statuses.get(result.statusCode) || 0) + 1);

      if (result.ok) ok += 1;
      else err += 1;
    }
  };

  await Promise.all(Array.from({ length: config.concurrency }, () => loop()));

  latencies.sort((a, b) => a - b);

  const result = {
    finishedAt: new Date().toISOString(),
    target: url.href,
    concurrency: config.concurrency,
    durationSec: config.durationMs / 1000,
    requests: done,
    ok,
    err,
    reqPerSec: Number((done / (config.durationMs / 1000)).toFixed(2)),
    statusCodes: Object.fromEntries(statuses),
    latencyMs: {
      avg: Number(
        (latencies.reduce((sum, latency) => sum + latency, 0) / (latencies.length || 1)).toFixed(2),
      ),
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      p99: percentile(latencies, 0.99),
      max: latencies[latencies.length - 1] || 0,
    },
  };

  console.log(JSON.stringify(result, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
