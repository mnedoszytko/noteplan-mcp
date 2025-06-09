# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-06-09

### Initial Release

A comprehensive MCP server for NotePlan that enables Claude to interact with your notes and tasks.

#### Core Features
- **Note Management**
  - Read today's daily note and notes from specific dates
  - Read any note by path
  - Search across all notes with optional folder filtering
  - Append content to notes
  - Full support for both Calendar (daily notes) and Notes directories

- **Task Management**
  - List all tasks with completion status filtering
  - Add new tasks with main (*) or sub (+) task types
  - Toggle task completion status
  - Edit existing task text while preserving status
  - Support for time-blocked tasks (HH:MM-HH:MM format)
  - Add subtasks under existing parent tasks

- **Template System**
  - List all available templates from @Templates folder
  - Create new notes from templates with variable substitution
  - Built-in variables: date, time, datetime, year, month, day, weekday, title
  - Support for custom variables
  - Auto-generates filenames if not specified

- **Period Notes**
  - Access weekly planning notes (YYYY-WNN format)
  - Access monthly review notes (YYYY-MM format)
  - Access quarterly planning notes (YYYY-QN format)
  - All period notes default to current period when no parameters provided

- **Bulk Operations**
  - Bulk reschedule tasks matching various criteria
  - Filter by overdue status, specific date, date range, text search, or project
  - Dry run mode for previewing changes
  - Preserves original dates with NotePlan's `<date>` format

- **Advanced Features**
  - Image support for NotePlan attachments
  - Multiple path resolution strategies for finding files
  - Project folder listing and organization
  - Efficient text manipulation (remove/replace text in notes)
  - Comprehensive error handling and validation

#### Technical Details
- Built with TypeScript and Model Context Protocol SDK
- Support for various image formats (PNG, JPEG, GIF, WebP)
- Configurable NotePlan base path via environment variable
- Cross-platform path handling
- MIT licensed