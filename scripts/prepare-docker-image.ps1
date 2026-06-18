param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z0-9]+(?:(?:[._-]|__)[a-z0-9]+)*(?:/[a-z0-9]+(?:(?:[._-]|__)[a-z0-9]+)*)*(?::[A-Za-z0-9_.-]+)?(?:@[A-Za-z][A-Za-z0-9]*(?:[+._-][A-Za-z][A-Za-z0-9]*)*:[A-Fa-f0-9]{32,})?$')]
  [string] $Image
)

function Test-DockerImageAvailable {
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & docker image inspect $Image 1>$null 2>$null
    return $LASTEXITCODE -eq 0
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

$ErrorActionPreference = "Stop"

if (Test-DockerImageAvailable) {
  Write-Output "Docker image '$Image' is already available."
  exit 0
}

Write-Output "Pulling Docker image '$Image'..."
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
  & docker pull $Image
  $pullExitCode = $LASTEXITCODE
} finally {
  $ErrorActionPreference = $previousErrorActionPreference
}

if ($pullExitCode -ne 0) {
  Write-Output "Unable to pull Docker image '$Image'."
  exit $pullExitCode
}

if (-not (Test-DockerImageAvailable)) {
  Write-Output "Docker image '$Image' was pulled but cannot be inspected."
  exit 1
}

Write-Output "Docker image '$Image' is ready."
