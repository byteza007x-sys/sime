import http from "http";
import os from "os";
import { performance } from "perf_hooks";

const port = Number(process.env.PORT || 3000);
const paths = ["/api/health", "/login"];

function getWifiAddress() {
  const entries = Object.entries(os.networkInterfaces()).flatMap(([name, addresses]) =>
    (addresses ?? [])
      .filter((address) => address.family === "IPv4" && !address.internal)
      .map((address) => ({ name, address: address.address })),
  );

  return (
    entries.find((entry) => entry.name.toLowerCase().includes("wi-fi")) ??
    entries.find((entry) => entry.address.startsWith("192.168.")) ??
    entries[0]
  );
}

function requestPath(path) {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const request = http.get(
      {
        host: "127.0.0.1",
        port,
        path,
        timeout: 5000,
      },
      (response) => {
        response.resume();
        response.on("end", () => {
          resolve({
            path,
            ok: response.statusCode && response.statusCode < 500,
            status: response.statusCode,
            ms: Math.round(performance.now() - startedAt),
          });
        });
      },
    );

    request.on("timeout", () => {
      request.destroy();
      resolve({ path, ok: false, status: "timeout", ms: 5000 });
    });
    request.on("error", () => {
      resolve({
        path,
        ok: false,
        status: "error",
        ms: Math.round(performance.now() - startedAt),
      });
    });
  });
}

const address = getWifiAddress();
const results = await Promise.all(paths.map(requestPath));

console.log("");
console.log("e service phone performance check");
console.log("---------------------------------");

for (const result of results) {
  const label = result.ok ? "OK" : "SLOW/FAIL";
  console.log(`${label} ${result.path} ${result.status} ${result.ms}ms`);
}

console.log("");
if (address) {
  console.log(`Phone URL: http://${address.address}:${port}`);
}
console.log("");
console.log("Fast mobile test mode:");
console.log("1. Stop next dev if it is running.");
console.log("2. Run: npm.cmd run phone:build");
console.log("3. Run: npm.cmd run phone:start");
console.log("4. Open the Phone URL on the phone.");
console.log("");
console.log("If the phone is still slow, check Wi-Fi signal, VPN, Windows Firewall, and XAMPP MySQL.");
console.log("");
