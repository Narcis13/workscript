# Sandbox

Sandboxed file storage for the Workscript agentic workflow platform.

## Purpose

The sandbox directory provides a secure, isolated location for storing files that workflows and users can create, read, update, and delete. All file operations are restricted to this directory to prevent access to the broader filesystem.

## Directory Structure

```
apps/sandbox/
├── resources/           # Persistent file storage
│   └── {tenant-id}/     # Tenant-specific directories (created on demand)
│       ├── prompts/     # AI prompt templates (.md)
│       ├── media/       # Images (.png, .jpg, .gif, .webp) and audio (.mp3, .wav)
│       ├── documents/   # PDFs and text documents (.pdf, .txt, .md)
│       ├── data/        # Data files (.json, .csv)
│       └── exports/     # Workflow-generated outputs
├── tmp/                 # Temporary file processing (auto-cleaned)
└── readme.md            # This file
```

## Allowed File Types

| Type | Extensions | Max Size |
|------|------------|----------|
| Prompts | .md | 50MB |
| Images | .png, .jpg, .jpeg, .gif, .webp | 50MB |
| Audio | .mp3, .wav | 50MB |
| Documents | .pdf, .txt, .md | 50MB |
| Data | .json, .csv | 50MB |

## Security

- **Path Traversal Prevention**: All paths are validated to stay within the sandbox root
- **Symlink Resolution**: Symlinks pointing outside the sandbox are rejected
- **Tenant Isolation**: Each tenant can only access their own resources (or public resources)
- **MIME Type Validation**: File content is validated against expected types
- **Audit Logging**: All file operations are logged to the `resource_operations` table

## Usage

Files in this directory are managed via the Resources API:

- `POST /workscript/resources/create` - Create from content
- `POST /workscript/resources/upload` - Upload file
- `GET /workscript/resources/:id/content` - Download file
- `PUT /workscript/resources/:id/content` - Update file content
- `DELETE /workscript/resources/:id` - Soft delete (file remains)

## Notes

- Files are NOT automatically cleaned up on deletion (soft delete only)
- The `tmp/` directory is used for upload processing and may be periodically cleaned
- `.gitkeep` files preserve empty directories in version control
- Never commit actual resource files to the repository
