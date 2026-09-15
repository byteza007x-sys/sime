# Mobile And Tablet Testing

Use this when testing e service from a phone, iPad, or Android tablet on the same Wi-Fi as the development PC.

## Fast Mobile Test Mode

Use this mode when testing on a real phone or tablet. It is much faster than `next dev`.

```powershell
npm.cmd run phone:build
npm.cmd run phone:start
```

Keep XAMPP MySQL running before opening the site.

## Dev Mode

This is useful while editing code, but the first page load on a phone can be slow because Next.js compiles pages on demand.

```powershell
npm.cmd run dev:phone
```

## Find The Phone URL

```powershell
npm.cmd run lan:info
```

Open the Wi-Fi URL on the phone. Example:

```text
http://192.168.1.43:3000
```

Do not use `localhost` on the phone. On a phone, `localhost` means the phone itself, not the PC.

## Check Speed

```powershell
npm.cmd run phone:check
```

If local `/login` is fast but the phone is slow, the issue is usually Wi-Fi, firewall, VPN, or the phone not being on the same network.

## If The Phone Times Out

1. Make sure the phone and PC are on the same Wi-Fi.
2. Turn off VPN/hotspot isolation/guest Wi-Fi while testing.
3. Allow inbound TCP port `3000` in Windows Firewall.
4. If needed, run PowerShell as Administrator:

```powershell
.\scripts\allow-dev-firewall.ps1
```

## Production Note

For real field use, deploy with HTTPS. Browser GPS is more reliable on HTTPS, and some mobile browser features may be restricted on plain HTTP LAN URLs.
