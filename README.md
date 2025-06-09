# NotePlan MCP Server

MCP (Model Context Protocol) server for interacting with [NotePlan](https://noteplan.co/) notes through Claude or other LLMs.

NotePlan is a powerful markdown-based note-taking and task management app for macOS and iOS that combines calendar, notes, and todos in one place.

## Features

- **Read daily notes**: Access today's note or any specific date
- **Search notes**: Find notes containing specific text
- **List tasks**: Extract todos from your notes with completion status
- **Browse projects**: List all project folders and their contents
- **Query specific notes**: Read any note by its path

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## Configuration

### NotePlan Data Directory

By default, the server looks for NotePlan data in the standard macOS location:
```
~/Library/Containers/co.noteplan.NotePlan3/Data/Library/Application Support/co.noteplan.NotePlan3
```

If you have NotePlan installed in a different location or are using a different operating system, you can override this by setting the `NOTEPLAN_BASE_PATH` environment variable:

```bash
export NOTEPLAN_BASE_PATH="/path/to/your/noteplan/data"
```

Or create a `.env` file in the project root:
```
NOTEPLAN_BASE_PATH="/path/to/your/noteplan/data"
```

## Usage with Claude Desktop

Add this to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "noteplan": {
      "command": "node",
      "args": ["/path/to/noteplan-mcp/dist/index.js"]
    }
  }
}
```

## Usage with Claude Code

The MCP server is already configured in `.claude/settings.local.json`. When you open this project in Claude Code, the NotePlan MCP server will be automatically available.

Alternatively, you can add it to any project by including this in `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "noteplan": {
      "command": "node",
      "args": ["/path/to/noteplan-mcp/dist/index.js"]
    }
  }
}
```

## Available Tools

### `read_today_note`
Reads today's daily note from NotePlan.

### `read_date_note`
Reads a daily note for a specific date.
- `date`: Date in YYYY-MM-DD format

### `read_note`
Reads a specific note by its path.
- `notePath`: Path relative to Notes directory (e.g., "10 - Projects/My Project/My Project JV - main points.txt")

### `search_notes`
Searches for notes containing specific text.
- `query`: Search query
- `folder`: (optional) Limit search to specific folder

### `list_tasks`
Lists all tasks from notes.
- `includeCompleted`: (optional) Include completed tasks
- `folder`: (optional) Limit to specific folder

### `list_projects`
Lists all project folders and their note counts.

### `add_task`
Adds a task to a note (defaults to today's note).
- `task`: Task description
- `type`: (optional) "main" (*) or "sub" (+), defaults to "sub"
- `date`: (optional) Date in YYYY-MM-DD format
- `notePath`: (optional) Path to specific note (overrides date)
- `parentTask`: (optional) Parent task to add this as a subtask
- `timeBlock`: (optional) Time block in HH:MM-HH:MM format

### `append_to_note`
Appends content to a note (defaults to today's note).
- `content`: Content to append
- `date`: (optional) Date in YYYY-MM-DD format
- `notePath`: (optional) Path to specific note (overrides date)

### `toggle_task`
Toggles a task between done ([x]) and undone.
- `taskQuery`: Part of the task text to find it
- `date`: (optional) Date in YYYY-MM-DD format
- `notePath`: (optional) Path to specific note (overrides date)
- `occurrence`: (optional) Which occurrence to toggle (defaults to 1)

### `edit_task`
Edits an existing task's text while preserving its status.
- `oldTaskQuery`: Part of the current task text to find it
- `newTaskText`: New task text (without * or + prefix)
- `date`: (optional) Date in YYYY-MM-DD format
- `notePath`: (optional) Path to specific note (overrides date)
- `occurrence`: (optional) Which occurrence to edit (defaults to 1)

## Development

Run in development mode:
```bash
npm run dev
```

## Example Queries

- "Show me today's tasks"
- "Search for notes about My Project"
- "What are my incomplete tasks in the Projects folder?"
- "Read my note about My Project JV main points"
- "Add a task to today's note: Review code changes"
- "Add a time-blocked task: 16:00-17:00 Team meeting"
- "Add a subtask under 'New Project'"
- "Mark 'test ig' as done"
- "Toggle the task containing 'break'"
- "Edit task 'this one is not done' to 'Complete the documentation'"

## Author

**Michal Nedoszytko**  
Email: michal@nedoszytko.be  
Website: [nedoszytko.com](https://nedoszytko.com)

Check out my other projects:
- [Previsit.ai](https://previsit.ai) - AI-powered pre-visit preparation platform
- [MedDuties.com](https://medduties.com) - Medical duty management system