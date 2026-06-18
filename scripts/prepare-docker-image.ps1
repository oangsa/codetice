param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z0-9]+(?:(?:[._-]|__)[a-z0-9]+)*(?:/[a-z0-9]+(?:(?:[._-]|__)[a-z0-9]+)*)*(?::[A-Za-z0-9_.-]+)?(?:@[A-Za-z][A-Za-z0-9]*(?:[+._-][A-Za-z][A-Za-z0-9]*)*:[A-Fa-f0-9]{32,})?$')]
  [string] $Image
)

$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

docker image inspect $Image *> $null
if ($LASTEXITCODE -eq 0) {
  Write-Output "Docker image '$Image' is already available."
  exit 0
}

Write-Output "Pulling Docker image '$Image'..."
docker pull $Image
if ($LASTEXITCODE -ne 0) {
  Write-Error "Unable to pull Docker image '$Image'."
  exit $LASTEXITCODE
}

docker image inspect $Image *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Error "Docker image '$Image' was pulled but cannot be inspected."
  exit 1
}

Write-Output "Docker image '$Image' is ready."
