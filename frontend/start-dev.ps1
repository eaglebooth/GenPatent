$logPath = "D:\Genlayer\GenPatent\frontend\dev-server.log"
"Starting GenPatent dev server at $(Get-Date -Format o)" | Set-Content -LiteralPath $logPath
Set-Location -LiteralPath "D:\Genlayer\GenPatent\frontend"
& "C:\Program Files\nodejs\npm.cmd" run dev -- -p 3036 *>&1 | Tee-Object -FilePath $logPath -Append
