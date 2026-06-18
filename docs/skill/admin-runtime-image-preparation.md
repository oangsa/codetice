# Admin Runtime Image Preparation

- Creating a supported language prepares its Docker image before inserting the database row.
- Editing an enabled supported language prepares/verifies the Docker image before saving, even when the image value did not change.
- Image preparation runs through `scripts/prepare-docker-image.ps1` on Windows and `scripts/prepare-docker-image.sh` on Linux/macOS servers.
- The scripts first run `docker image inspect`; they only run `docker pull` when the image is missing.
- API routes return an error and do not save the language when image preparation fails.
- Docker image references are validated before script execution, and the image value is passed as an argument rather than shell-concatenated.
