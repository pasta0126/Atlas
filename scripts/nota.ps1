# Envía una nota rápida al inbox de Atlas (POST /api/inbox) desde Windows,
# usando curl.exe (que en equipos con Zscaler llega donde el navegador no).
#
# Requiere la variable de entorno ATLAS_TOKEN (una sola vez):
#   [Environment]::SetEnvironmentVariable("ATLAS_TOKEN", "<token>", "User")
#
# Uso:
#   .\nota.ps1 "texto de la nota"
#   .\nota.ps1 -Titulo "Reunión" "texto de la nota"
#   Get-Content apuntes.txt -Raw | .\nota.ps1
#   .\nota.ps1                      # abre el Bloc de notas; al cerrarlo, se envía
param(
  [string]$Titulo,
  [Parameter(ValueFromPipeline = $true, ValueFromRemainingArguments = $true)]
  [string[]]$Texto
)

begin { $lineas = @() }
process { if ($Texto) { $lineas += $Texto } }
end {
  $url = if ($env:ATLAS_URL) { $env:ATLAS_URL } else { "https://atlas.northernarchive.com" }
  $token = $env:ATLAS_TOKEN
  if (-not $token) {
    Write-Error "Falta ATLAS_TOKEN. Configúralo con: [Environment]::SetEnvironmentVariable('ATLAS_TOKEN', '<token>', 'User') y abre otra consola."
    exit 1
  }

  $tmp = Join-Path $env:TEMP ("atlas-nota-" + [guid]::NewGuid() + ".md")
  $utf8 = New-Object System.Text.UTF8Encoding $false
  try {
    if ($lineas.Count -gt 0) {
      $separador = if ($MyInvocation.ExpectingInput) { "`n" } else { " " }
      [IO.File]::WriteAllText($tmp, ($lineas -join $separador), $utf8)
    } else {
      [IO.File]::WriteAllText($tmp, "", $utf8)
      Start-Process notepad.exe -ArgumentList "`"$tmp`"" -Wait
    }

    if (-not ([IO.File]::ReadAllText($tmp, $utf8).Trim())) {
      Write-Host "Nota vacía, no se envía nada."
      exit 0
    }

    $endpoint = "$url/api/inbox"
    if ($Titulo) { $endpoint += "?titulo=" + [uri]::EscapeDataString($Titulo) }

    curl.exe -sS --fail-with-body -X POST $endpoint `
      -H "Authorization: Bearer $token" `
      -H "Content-Type: text/plain; charset=utf-8" `
      --data-binary "@$tmp"
    Write-Host ""
    if ($LASTEXITCODE -ne 0) {
      Write-Error "No se ha podido enviar la nota (se conserva en $tmp)."
      $tmp = $null
      exit 1
    }
  } finally {
    if ($tmp -and (Test-Path $tmp)) { Remove-Item $tmp }
  }
}
