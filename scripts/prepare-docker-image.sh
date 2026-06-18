#!/bin/sh
set -eu

IMAGE="${1:-}"

case "$IMAGE" in
  ""|*[!abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ._:/@+-]*)
    echo "Docker image must be a valid image reference." >&2
    exit 2
    ;;
esac

if docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Docker image '$IMAGE' is already available."
  exit 0
fi

echo "Pulling Docker image '$IMAGE'..."
docker pull "$IMAGE"

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Docker image '$IMAGE' was pulled but cannot be inspected." >&2
  exit 1
fi

echo "Docker image '$IMAGE' is ready."
