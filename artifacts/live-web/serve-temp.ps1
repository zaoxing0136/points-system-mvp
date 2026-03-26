$ErrorActionPreference = 'Stop'
$root = 'D:\软件产品开发\03月积分系统MVP\artifacts\live-web'
$log = 'D:\软件产品开发\03月积分系统MVP\artifacts\live-web\server.trace.log'
'boot' | Out-File -FilePath $log -Encoding utf8
function Get-ContentType([string]$path) {
  switch ([System.IO.Path]::GetExtension($path).ToLowerInvariant()) {
    '.html' { 'text/html; charset=utf-8'; break }
    '.js' { 'text/javascript; charset=utf-8'; break }
    '.css' { 'text/css; charset=utf-8'; break }
    '.json' { 'application/json; charset=utf-8'; break }
    '.svg' { 'image/svg+xml'; break }
    '.png' { 'image/png'; break }
    '.jpg' { 'image/jpeg'; break }
    '.jpeg' { 'image/jpeg'; break }
    '.webp' { 'image/webp'; break }
    '.gif' { 'image/gif'; break }
    '.ico' { 'image/x-icon'; break }
    '.woff' { 'font/woff'; break }
    '.woff2' { 'font/woff2'; break }
    default { 'application/octet-stream' }
  }
}
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse('127.0.0.1'), 4175)
$listener.Start()
'started' | Out-File -FilePath $log -Append -Encoding utf8
while ($true) {
  $client = $listener.AcceptTcpClient()
  'accepted' | Out-File -FilePath $log -Append -Encoding utf8
  $stream = $null
  $reader = $null
  try {
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
    $requestLine = $reader.ReadLine()
    if ([string]::IsNullOrWhiteSpace($requestLine)) {
      $client.Close()
      continue
    }
    while ($true) {
      $headerLine = $reader.ReadLine()
      if ($null -eq $headerLine -or $headerLine -eq '') { break }
    }
    $parts = $requestLine.Split(' ')
    $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
    $requestPath = [System.Uri]::UnescapeDataString(($rawPath.Split('?')[0]).TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($requestPath)) { $requestPath = 'login.html' }
    $fullRoot = [System.IO.Path]::GetFullPath($root)
    $fullTarget = [System.IO.Path]::GetFullPath((Join-Path $root $requestPath))
    if (-not $fullTarget.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $fullTarget -PathType Leaf)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
      $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($body, 0, $body.Length)
      continue
    }
    $body = [System.IO.File]::ReadAllBytes($fullTarget)
    $header = "HTTP/1.1 200 OK`r`nContent-Type: $(Get-ContentType $fullTarget)`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    $stream.Write($body, 0, $body.Length)
  } catch {
    $_ | Out-File -FilePath $log -Append -Encoding utf8
  } finally {
    if ($reader) { $reader.Dispose() }
    if ($stream) { $stream.Dispose() }
    $client.Close()
  }
}
