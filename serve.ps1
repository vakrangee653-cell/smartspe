# serve.ps1 - Native PowerShell HTTP Server for Smart CSC Tools
# Serves the static files from the current folder on port 8080

$port = 8081
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "Local server running at http://localhost:$port/"
    Write-Host "Press Ctrl+C in the terminal to stop."
} catch {
    Write-Error "Failed to start listener: $_"
    exit 1
}

# Keep running until stopped
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/") {
            $urlPath = "/index.html"
        }
        
        # Ensure path points within the project directory to prevent path traversal
        $fullPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $urlPath))
        $rootPath = [System.IO.Path]::GetFullPath($PSScriptRoot)
        
        if (-not $fullPath.StartsWith($rootPath)) {
            $response.StatusCode = 403
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        if (Test-Path $fullPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            
            # MIME type determination
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css" }
                ".js"   { $response.ContentType = "application/javascript" }
                ".png"  { $response.ContentType = "image/png" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".jpeg" { $response.ContentType = "image/jpeg" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                ".ico"  { $response.ContentType = "image/x-icon" }
                default { $response.ContentType = "application/octet-stream" }
            }
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        $response.Close()
    } catch {
        # Silent fail for closed socket exceptions on refresh/close
        if ($listener.IsListening) {
            Write-Host "Error serving request: $_"
        }
    }
}
