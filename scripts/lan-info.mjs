import http from "http";
import os from "os";

const port = Number(process.env.PORT || 3000);

function getLanAddresses() {
  return Object.entries(os.networkInterfaces())
    .flatMap(([name, addresses]) =>
      (addresses ?? [])
        .filter((address) => address.family === "IPv4" && !address.internal)
        .map((address) => ({
          name,
          address: address.address,
        })),
    )
    .filter((item) => !item.address.startsWith("169.254."));
}

function checkLocalServer() {
  return new Promise((resolve) => {
    const request = http.get(
      {
        host: "127.0.0.1",
        port,
        path: "/api/health",
        timeout: 2500,
      },
      (response) => {
        response.resume();
        resolve(response.statusCode && response.statusCode < 500);
      },
    );

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

const addresses = getLanAddresses();
const serverReady = await checkLocalServer();

console.log("");
console.log("e service LAN check");
console.log("-------------------");
console.log(`Local server: ${serverReady ? "OK" : "Not responding"} on port ${port}`);
console.log("");

if (addresses.length === 0) {
  console.log("No LAN IPv4 address found. Connect this PC to Wi-Fi or LAN first.");
} else {
  console.log("Open one of these URLs on your phone/tablet:");
  for (const item of addresses) {
    console.log(`- http://${item.address}:${port}  (${item.name})`);
  }
}

console.log("");
console.log("For mobile testing:");
console.log("Fast mode, recommended:");
console.log("1. Run: npm.cmd run phone:build");
console.log("2. Run: npm.cmd run phone:start");
console.log("3. Open the Wi-Fi URL on the phone.");
console.log("");
console.log("Dev mode is slower:");
console.log("- npm.cmd run dev:phone");
console.log("");
console.log("Keep XAMPP MySQL running. If it times out, allow inbound TCP 3000 in Windows Firewall.");
console.log("");
