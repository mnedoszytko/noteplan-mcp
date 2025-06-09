import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as os from 'os';

// Determine NotePlan base directory dynamically
const getNotePlanBase = (): string => {
  // Allow override via environment variable
  if (process.env.NOTEPLAN_BASE_PATH) {
    return process.env.NOTEPLAN_BASE_PATH;
  }
  
  // Default to standard macOS location using home directory
  const homeDir = os.homedir();
  return path.join(homeDir, 'Library/Containers/co.noteplan.NotePlan3/Data/Library/Application Support/co.noteplan.NotePlan3');
};

const NOTEPLAN_BASE = getNotePlanBase();
const NOTES_DIR = path.join(NOTEPLAN_BASE, 'Notes');
const CALENDAR_DIR = path.join(NOTEPLAN_BASE, 'Calendar');

class NotePlanServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'noteplan-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'read_today_note',
          description: 'Read today\'s daily note from NotePlan',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'read_date_note',
          description: 'Read a daily note for a specific date',
          inputSchema: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format',
              },
            },
            required: ['date'],
          },
        },
        {
          name: 'read_note',
          description: 'Read a specific note by its path or title',
          inputSchema: {
            type: 'object',
            properties: {
              notePath: {
                type: 'string',
                description: 'Path to the note relative to Notes directory',
              },
            },
            required: ['notePath'],
          },
        },
        {
          name: 'search_notes',
          description: 'Search for notes containing specific text',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              folder: {
                type: 'string',
                description: 'Optional folder to limit search (e.g., "10 - Projects")',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'list_tasks',
          description: 'List all tasks from notes',
          inputSchema: {
            type: 'object',
            properties: {
              includeCompleted: {
                type: 'boolean',
                description: 'Include completed tasks',
                default: false,
              },
              folder: {
                type: 'string',
                description: 'Optional folder to limit search',
              },
            },
          },
        },
        {
          name: 'list_projects',
          description: 'List all project folders and their notes',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'add_task',
          description: 'Add a task to a note (today\'s note by default)',
          inputSchema: {
            type: 'object',
            properties: {
              task: {
                type: 'string',
                description: 'Task description',
              },
              type: {
                type: 'string',
                description: 'Task type: "main" (*) or "sub" (+)',
                enum: ['main', 'sub'],
                default: 'sub',
              },
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format (defaults to today)',
              },
              notePath: {
                type: 'string',
                description: 'Path to specific note (overrides date)',
              },
              parentTask: {
                type: 'string',
                description: 'Parent task to add this as a subtask',
              },
              timeBlock: {
                type: 'string',
                description: 'Time block in HH:MM-HH:MM format',
              },
            },
            required: ['task'],
          },
        },
        {
          name: 'append_to_note',
          description: 'Append content to a note',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'Content to append',
              },
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format (defaults to today)',
              },
              notePath: {
                type: 'string',
                description: 'Path to specific note (overrides date)',
              },
            },
            required: ['content'],
          },
        },
        {
          name: 'toggle_task',
          description: 'Toggle a task between done and undone',
          inputSchema: {
            type: 'object',
            properties: {
              taskQuery: {
                type: 'string',
                description: 'Part of the task text to find it',
              },
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format (defaults to today)',
              },
              notePath: {
                type: 'string',
                description: 'Path to specific note (overrides date)',
              },
              occurrence: {
                type: 'number',
                description: 'Which occurrence to toggle (1-based, defaults to 1)',
                default: 1,
              },
            },
            required: ['taskQuery'],
          },
        },
        {
          name: 'edit_task',
          description: 'Edit an existing task',
          inputSchema: {
            type: 'object',
            properties: {
              oldTaskQuery: {
                type: 'string',
                description: 'Part of the current task text to find it',
              },
              newTaskText: {
                type: 'string',
                description: 'New task text (without * or + prefix)',
              },
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format (defaults to today)',
              },
              notePath: {
                type: 'string',
                description: 'Path to specific note (overrides date)',
              },
              occurrence: {
                type: 'number',
                description: 'Which occurrence to edit (1-based, defaults to 1)',
                default: 1,
              },
            },
            required: ['oldTaskQuery', 'newTaskText'],
          },
        },
        {
          name: 'reschedule_task',
          description: 'Reschedule a task to a different date (NotePlan style)',
          inputSchema: {
            type: 'object',
            properties: {
              taskQuery: {
                type: 'string',
                description: 'Part of the task text to find it',
              },
              fromDate: {
                type: 'string',
                description: 'Source date in YYYY-MM-DD format (defaults to today)',
              },
              toDate: {
                type: 'string',
                description: 'Target date in YYYY-MM-DD format',
              },
              occurrence: {
                type: 'number',
                description: 'Which occurrence to reschedule (1-based, defaults to 1)',
                default: 1,
              },
            },
            required: ['taskQuery', 'toDate'],
          },
        },
        {
          name: 'list_templates',
          description: 'List all available note templates',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'create_from_template',
          description: 'Create a new note from a template with variable substitution',
          inputSchema: {
            type: 'object',
            properties: {
              templateName: {
                type: 'string',
                description: 'Name of the template file (without .txt/.md extension)',
              },
              targetPath: {
                type: 'string',
                description: 'Path where to create the note (relative to Notes/, optional)',
              },
              targetName: {
                type: 'string',
                description: 'Name for the new note (optional, auto-generated if not provided)',
              },
              variables: {
                type: 'object',
                description: 'Key-value pairs for template variable replacement',
                additionalProperties: { type: 'string' },
              },
            },
            required: ['templateName'],
          },
        },
        {
          name: 'read_weekly_note',
          description: 'Read a weekly planning note (YYYY-WNN format)',
          inputSchema: {
            type: 'object',
            properties: {
              year: {
                type: 'number',
                description: 'Year (optional, defaults to current year)',
              },
              week: {
                type: 'number',
                description: 'Week number 1-53 (optional, defaults to current week)',
              },
            },
          },
        },
        {
          name: 'read_monthly_note',
          description: 'Read a monthly review note (YYYY-MM format)',
          inputSchema: {
            type: 'object',
            properties: {
              year: {
                type: 'number',
                description: 'Year (optional, defaults to current year)',
              },
              month: {
                type: 'number',
                description: 'Month number 1-12 (optional, defaults to current month)',
              },
            },
          },
        },
        {
          name: 'read_quarterly_note',
          description: 'Read a quarterly planning note (YYYY-QN format)',
          inputSchema: {
            type: 'object',
            properties: {
              year: {
                type: 'number',
                description: 'Year (optional, defaults to current year)',
              },
              quarter: {
                type: 'number',
                description: 'Quarter number 1-4 (optional, defaults to current quarter)',
              },
            },
          },
        },
        {
          name: 'bulk_reschedule_tasks',
          description: 'Move multiple tasks matching criteria to a new date',
          inputSchema: {
            type: 'object',
            properties: {
              criteria: {
                type: 'object',
                description: 'Filter criteria for selecting tasks',
                properties: {
                  overdue: {
                    type: 'boolean',
                    description: 'Select all overdue tasks (from dates before today)',
                  },
                  fromDate: {
                    type: 'string',
                    description: 'Select tasks from this specific date (YYYY-MM-DD)',
                  },
                  dateRange: {
                    type: 'object',
                    description: 'Select tasks within a date range',
                    properties: {
                      start: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
                      end: { type: 'string', description: 'End date (YYYY-MM-DD)' },
                    },
                  },
                  containing: {
                    type: 'string',
                    description: 'Select tasks containing this text',
                  },
                  project: {
                    type: 'string',
                    description: 'Select tasks from a specific project/tag',
                  },
                },
              },
              toDate: {
                type: 'string',
                description: 'Target date to move all matching tasks (YYYY-MM-DD)',
              },
              preserveOriginalDate: {
                type: 'boolean',
                description: 'Keep <date> references when moving (default: true)',
                default: true,
              },
              dryRun: {
                type: 'boolean',
                description: 'Preview changes without applying them (default: false)',
                default: false,
              },
            },
            required: ['criteria', 'toDate'],
          },
        },
        {
          name: 'remove_text_from_note',
          description: 'Remove specific text from a note',
          inputSchema: {
            type: 'object',
            properties: {
              textToRemove: {
                type: 'string',
                description: 'Text to remove from the note',
              },
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format (defaults to today)',
              },
              notePath: {
                type: 'string',
                description: 'Path to specific note (overrides date)',
              },
              removeAll: {
                type: 'boolean',
                description: 'Remove all occurrences (default: false, removes first only)',
                default: false,
              },
            },
            required: ['textToRemove'],
          },
        },
        {
          name: 'replace_text_in_note',
          description: 'Replace text in a note with new content',
          inputSchema: {
            type: 'object',
            properties: {
              oldText: {
                type: 'string',
                description: 'Text to replace',
              },
              newText: {
                type: 'string',
                description: 'New text to replace it with',
              },
              date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format (defaults to today)',
              },
              notePath: {
                type: 'string',
                description: 'Path to specific note (overrides date)',
              },
              replaceAll: {
                type: 'boolean',
                description: 'Replace all occurrences (default: false, replaces first only)',
                default: false,
              },
            },
            required: ['oldText', 'newText'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'read_today_note':
          return await this.readTodayNote();
        case 'read_date_note':
          return await this.readDateNote((args as any).date);
        case 'read_note':
          return await this.readNote((args as any).notePath);
        case 'search_notes':
          return await this.searchNotes((args as any).query, (args as any).folder);
        case 'list_tasks':
          return await this.listTasks((args as any).includeCompleted || false, (args as any).folder);
        case 'list_projects':
          return await this.listProjects();
        case 'add_task':
          return await this.addTask(
            (args as any).task,
            (args as any).type || 'sub',
            (args as any).date,
            (args as any).notePath,
            (args as any).parentTask,
            (args as any).timeBlock
          );
        case 'append_to_note':
          return await this.appendToNote(
            (args as any).content,
            (args as any).date,
            (args as any).notePath
          );
        case 'toggle_task':
          return await this.toggleTask(
            (args as any).taskQuery,
            (args as any).date,
            (args as any).notePath,
            (args as any).occurrence || 1
          );
        case 'edit_task':
          return await this.editTask(
            (args as any).oldTaskQuery,
            (args as any).newTaskText,
            (args as any).date,
            (args as any).notePath,
            (args as any).occurrence || 1
          );
        case 'reschedule_task':
          return await this.rescheduleTask(
            (args as any).taskQuery,
            (args as any).fromDate,
            (args as any).toDate,
            (args as any).occurrence || 1
          );
        case 'list_templates':
          return await this.listTemplates();
        case 'create_from_template':
          return await this.createFromTemplate(
            (args as any).templateName,
            (args as any).targetPath,
            (args as any).targetName,
            (args as any).variables
          );
        case 'read_weekly_note':
          return await this.readWeeklyNote(
            (args as any).year,
            (args as any).week
          );
        case 'read_monthly_note':
          return await this.readMonthlyNote(
            (args as any).year,
            (args as any).month
          );
        case 'read_quarterly_note':
          return await this.readQuarterlyNote(
            (args as any).year,
            (args as any).quarter
          );
        case 'bulk_reschedule_tasks':
          return await this.bulkRescheduleTasks(
            (args as any).criteria,
            (args as any).toDate,
            (args as any).preserveOriginalDate ?? true,
            (args as any).dryRun ?? false
          );
        case 'remove_text_from_note':
          return await this.removeTextFromNote(
            (args as any).textToRemove,
            (args as any).date,
            (args as any).notePath,
            (args as any).removeAll ?? false
          );
        case 'replace_text_in_note':
          return await this.replaceTextInNote(
            (args as any).oldText,
            (args as any).newText,
            (args as any).date,
            (args as any).notePath,
            (args as any).replaceAll ?? false
          );
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async readTodayNote() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const notePath = path.join(CALENDAR_DIR, `${dateStr}.txt`);

    try {
      const content = await fs.readFile(notePath, 'utf-8');
      return await this.processContentWithImages(content, `Today's note (${today.toISOString().split('T')[0]}):\n\n`, CALENDAR_DIR);
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `No note found for today (${today.toISOString().split('T')[0]})`,
          },
        ],
      };
    }
  }

  private async processContentWithImages(content: string, prefix: string, baseDir: string) {
    let processedText = prefix + content;
    
    // Find image references in the format ![image](path)
    const imageRegex = /!\[image\]\(([^)]+)\)/g;
    let match;
    const images: any[] = [];

    while ((match = imageRegex.exec(content)) !== null) {
      const imagePath = match[1];
      
      // Try multiple possible paths for the image
      const possiblePaths = [
        path.join(baseDir, imagePath), // Original relative to note location
        path.join(CALENDAR_DIR, imagePath), // Relative to Calendar directory
        path.join(NOTEPLAN_BASE, imagePath), // Relative to NotePlan base
        path.join(NOTEPLAN_BASE, 'Calendar', imagePath), // Explicit Calendar path
        path.join(NOTEPLAN_BASE, 'Notes', imagePath), // Explicit Notes path
        path.join(NOTEPLAN_BASE, 'Attachments', imagePath), // Attachments directory
        path.join(NOTEPLAN_BASE, 'Calendar', 'Attachments', imagePath), // Calendar attachments
        path.join(NOTEPLAN_BASE, 'Notes', 'Attachments', imagePath), // Notes attachments
      ];

      let fullImagePath: string | null = null;
      
      // Try each possible path
      for (const testPath of possiblePaths) {
        try {
          await fs.access(testPath);
          fullImagePath = testPath;
          break;
        } catch {
          // Continue to next path
        }
      }

      if (fullImagePath) {
        try {
          // Read image and convert to base64
          const imageBuffer = await fs.readFile(fullImagePath);
          const base64Image = imageBuffer.toString('base64');
          
          // Determine MIME type based on file extension
          const ext = path.extname(imagePath).toLowerCase();
          let mimeType = 'image/png'; // default
          if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
          else if (ext === '.gif') mimeType = 'image/gif';
          else if (ext === '.webp') mimeType = 'image/webp';

          // Add image as resource content with debug info
          const imageSizeKb = Math.round(imageBuffer.length / 1024);
          images.push({
            type: 'resource',
            resource: {
              uri: `data:${mimeType};base64,${base64Image}`,
              mimeType: mimeType,
              text: `Image: ${imagePath} (${imageSizeKb}KB, found at: ${fullImagePath})`
            }
          });
        } catch (error) {
          processedText += `\n[Error reading image: ${imagePath}]`;
        }
      } else {
        // Image file not found in any location
        processedText += `\n[Image not found: ${imagePath}]`;
      }
    }

    const result = [
      {
        type: 'text',
        text: processedText,
      },
      ...images
    ];

    return { content: result };
  }

  private async readDateNote(date: string) {
    const dateStr = date.replace(/-/g, '');
    const notePath = path.join(CALENDAR_DIR, `${dateStr}.txt`);

    try {
      const content = await fs.readFile(notePath, 'utf-8');
      return await this.processContentWithImages(content, `Note for ${date}:\n\n`, CALENDAR_DIR);
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `No note found for date ${date}`,
          },
        ],
      };
    }
  }

  private async readNote(notePath: string) {
    const fullPath = path.join(NOTES_DIR, notePath);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return await this.processContentWithImages(content, `Note: ${notePath}\n\n`, path.dirname(fullPath));
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading note: ${error}`,
          },
        ],
      };
    }
  }

  private async searchNotes(query: string, folder?: string) {
    const searchPath = folder ? path.join(NOTES_DIR, folder) : NOTES_DIR;
    const pattern = path.join(searchPath, '**/*.txt');
    const files = await glob(pattern);

    const results: Array<{ file: string; matches: string[] }> = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        const matches = lines.filter(line => 
          line.toLowerCase().includes(query.toLowerCase())
        );

        if (matches.length > 0) {
          const relativePath = path.relative(NOTES_DIR, file);
          results.push({
            file: relativePath,
            matches: matches.slice(0, 3), // First 3 matches
          });
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    const resultText = results.map(r => 
      `📄 ${r.file}\n${r.matches.map(m => `  → ${m.trim()}`).join('\n')}`
    ).join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${results.length} notes containing "${query}":\n\n${resultText || 'No matches found'}`,
        },
      ],
    };
  }

  private async listTasks(includeCompleted: boolean, folder?: string) {
    const searchPaths = [
      folder ? path.join(NOTES_DIR, folder) : NOTES_DIR,
      CALENDAR_DIR,
    ];

    const tasks: Array<{ file: string; task: string; completed: boolean }> = [];

    for (const searchPath of searchPaths) {
      const pattern = path.join(searchPath, '**/*.txt');
      const files = await glob(pattern);

      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const lines = content.split('\n');

          for (const line of lines) {
            const taskMatch = line.match(/^\s*[*+]\s+(.+)$/);
            if (taskMatch) {
              const isCompleted = line.includes('[x]') || line.includes('[X]');
              if (!isCompleted || includeCompleted) {
                const relativePath = path.relative(NOTEPLAN_BASE, file);
                tasks.push({
                  file: relativePath,
                  task: taskMatch[1].trim(),
                  completed: isCompleted,
                });
              }
            }
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

    const tasksByFile = tasks.reduce((acc, task) => {
      if (!acc[task.file]) acc[task.file] = [];
      acc[task.file].push(task);
      return acc;
    }, {} as Record<string, typeof tasks>);

    const resultText = Object.entries(tasksByFile).map(([file, fileTasks]) => 
      `📄 ${file}\n${fileTasks.map(t => 
        `  ${t.completed ? '✅' : '⬜'} ${t.task}`
      ).join('\n')}`
    ).join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${tasks.length} tasks:\n\n${resultText || 'No tasks found'}`,
        },
      ],
    };
  }

  private async listProjects() {
    try {
      const entries = await fs.readdir(NOTES_DIR, { withFileTypes: true });
      const folders = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();

      const projectInfo = await Promise.all(
        folders.map(async (folder) => {
          const folderPath = path.join(NOTES_DIR, folder);
          const files = await glob(path.join(folderPath, '**/*.txt'));
          return `📁 ${folder} (${files.length} notes)`;
        })
      );

      return {
        content: [
          {
            type: 'text',
            text: `NotePlan folders:\n\n${projectInfo.join('\n')}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing projects: ${error}`,
          },
        ],
      };
    }
  }

  private async addTask(
    task: string,
    type: 'main' | 'sub',
    date?: string,
    notePath?: string,
    parentTask?: string,
    timeBlock?: string
  ) {
    let targetPath: string;
    
    if (notePath) {
      // Check if it's a calendar path (weekly, monthly, quarterly notes)
      if (notePath.match(/^\d{4}-[WMQ]\d+\.txt$/) || notePath.startsWith('Calendar/')) {
        // Remove 'Calendar/' prefix if present
        const cleanPath = notePath.replace(/^Calendar\//, '');
        targetPath = path.join(CALENDAR_DIR, cleanPath);
      } else {
        targetPath = path.join(NOTES_DIR, notePath);
      }
    } else {
      const targetDate = date ? new Date(date) : new Date();
      const dateStr = targetDate.toISOString().split('T')[0].replace(/-/g, '');
      targetPath = path.join(CALENDAR_DIR, `${dateStr}.txt`);
    }

    try {
      let content = '';
      try {
        content = await fs.readFile(targetPath, 'utf-8');
      } catch {
        // File doesn't exist, we'll create it
        content = '';
      }

      const taskPrefix = type === 'main' ? '*' : '+';
      const taskText = timeBlock ? `${timeBlock} ${task}` : task;
      let newTask = `${taskPrefix} ${taskText}`;

      if (parentTask) {
        // Find the parent task and add as subtask
        const lines = content.split('\n');
        const parentIndex = lines.findIndex(line => 
          line.includes(parentTask)
        );

        if (parentIndex !== -1) {
          // Find the indentation level
          const parentIndent = lines[parentIndex].match(/^\s*/)?.[0] || '';
          const childIndent = parentIndent + '\t';
          
          // Find where to insert (after parent and its existing subtasks)
          let insertIndex = parentIndex + 1;
          while (insertIndex < lines.length) {
            const lineIndent = lines[insertIndex].match(/^\s+/)?.[0];
            if (!lineIndent || lineIndent.length <= parentIndent.length) {
              break;
            }
            insertIndex++;
          }
          
          lines.splice(insertIndex, 0, `${childIndent}${newTask}`);
          content = lines.join('\n');
        } else {
          // Parent not found, add at end
          content = content.trim() ? `${content}\n${newTask}` : newTask;
        }
      } else {
        // Add to end of file
        content = content.trim() ? `${content}\n${newTask}` : newTask;
      }

      await fs.writeFile(targetPath, content, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: `Task added successfully: ${newTask}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error adding task: ${error}`,
          },
        ],
      };
    }
  }

  private async appendToNote(
    content: string,
    date?: string,
    notePath?: string
  ) {
    let targetPath: string;
    
    if (notePath) {
      // Check if it's a calendar path (weekly, monthly, quarterly notes)
      if (notePath.match(/^\d{4}-[WMQ]\d+\.txt$/) || notePath.startsWith('Calendar/')) {
        // Remove 'Calendar/' prefix if present
        const cleanPath = notePath.replace(/^Calendar\//, '');
        targetPath = path.join(CALENDAR_DIR, cleanPath);
      } else {
        targetPath = path.join(NOTES_DIR, notePath);
      }
    } else {
      const targetDate = date ? new Date(date) : new Date();
      const dateStr = targetDate.toISOString().split('T')[0].replace(/-/g, '');
      targetPath = path.join(CALENDAR_DIR, `${dateStr}.txt`);
    }

    try {
      let existingContent = '';
      try {
        existingContent = await fs.readFile(targetPath, 'utf-8');
      } catch {
        // File doesn't exist, we'll create it
      }

      const newContent = existingContent.trim() 
        ? `${existingContent}\n${content}` 
        : content;

      await fs.writeFile(targetPath, newContent, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: `Content appended to note successfully`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error appending to note: ${error}`,
          },
        ],
      };
    }
  }

  private async toggleTask(
    taskQuery: string,
    date?: string,
    notePath?: string,
    occurrence: number = 1
  ) {
    let targetPath: string;
    
    if (notePath) {
      // Check if it's a calendar path (weekly, monthly, quarterly notes)
      if (notePath.match(/^\d{4}-[WMQ]\d+\.txt$/) || notePath.startsWith('Calendar/')) {
        // Remove 'Calendar/' prefix if present
        const cleanPath = notePath.replace(/^Calendar\//, '');
        targetPath = path.join(CALENDAR_DIR, cleanPath);
      } else {
        targetPath = path.join(NOTES_DIR, notePath);
      }
    } else {
      const targetDate = date ? new Date(date) : new Date();
      const dateStr = targetDate.toISOString().split('T')[0].replace(/-/g, '');
      targetPath = path.join(CALENDAR_DIR, `${dateStr}.txt`);
    }

    try {
      const content = await fs.readFile(targetPath, 'utf-8');
      const lines = content.split('\n');
      
      let foundCount = 0;
      let toggledLineIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check if it's a task line (* or +) and contains the query
        if ((line.match(/^\s*[*+]\s+/) && line.includes(taskQuery))) {
          foundCount++;
          if (foundCount === occurrence) {
            // Toggle the task
            if (line.includes('[x]') || line.includes('[X]')) {
              // Remove done marker
              lines[i] = line.replace(/\s*\[[xX]\]\s*/, ' ');
            } else {
              // Add done marker after the task prefix
              lines[i] = line.replace(/^(\s*[*+]\s+)/, '$1[x] ');
            }
            toggledLineIndex = i;
            break;
          }
        }
      }
      
      if (toggledLineIndex === -1) {
        return {
          content: [
            {
              type: 'text',
              text: `Task containing "${taskQuery}" not found (occurrence ${occurrence})`,
            },
          ],
        };
      }
      
      await fs.writeFile(targetPath, lines.join('\n'), 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: `Task toggled: ${lines[toggledLineIndex].trim()}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error toggling task: ${error}`,
          },
        ],
      };
    }
  }

  private async editTask(
    oldTaskQuery: string,
    newTaskText: string,
    date?: string,
    notePath?: string,
    occurrence: number = 1
  ) {
    let targetPath: string;
    
    if (notePath) {
      // Check if it's a calendar path (weekly, monthly, quarterly notes)
      if (notePath.match(/^\d{4}-[WMQ]\d+\.txt$/) || notePath.startsWith('Calendar/')) {
        // Remove 'Calendar/' prefix if present
        const cleanPath = notePath.replace(/^Calendar\//, '');
        targetPath = path.join(CALENDAR_DIR, cleanPath);
      } else {
        targetPath = path.join(NOTES_DIR, notePath);
      }
    } else {
      const targetDate = date ? new Date(date) : new Date();
      const dateStr = targetDate.toISOString().split('T')[0].replace(/-/g, '');
      targetPath = path.join(CALENDAR_DIR, `${dateStr}.txt`);
    }

    try {
      const content = await fs.readFile(targetPath, 'utf-8');
      const lines = content.split('\n');
      
      let foundCount = 0;
      let editedLineIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check if it's a task line (* or +) and contains the query
        if ((line.match(/^\s*[*+]\s+/) && line.includes(oldTaskQuery))) {
          foundCount++;
          if (foundCount === occurrence) {
            // Preserve the prefix (indentation, task marker, and done status)
            const match = line.match(/^(\s*[*+]\s+(?:\[[xX]\]\s*)?)/);
            if (match) {
              lines[i] = match[1] + newTaskText;
              editedLineIndex = i;
              break;
            }
          }
        }
      }
      
      if (editedLineIndex === -1) {
        return {
          content: [
            {
              type: 'text',
              text: `Task containing "${oldTaskQuery}" not found (occurrence ${occurrence})`,
            },
          ],
        };
      }
      
      await fs.writeFile(targetPath, lines.join('\n'), 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: `Task edited: ${lines[editedLineIndex].trim()}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error editing task: ${error}`,
          },
        ],
      };
    }
  }

  private async rescheduleTask(
    taskQuery: string,
    fromDate?: string,
    toDate?: string,
    occurrence: number = 1
  ) {
    if (!toDate) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: toDate is required for rescheduling',
          },
        ],
      };
    }

    const sourceDate = fromDate ? new Date(fromDate) : new Date();
    const sourceDateStr = sourceDate.toISOString().split('T')[0].replace(/-/g, '');
    const sourceTargetPath = path.join(CALENDAR_DIR, `${sourceDateStr}.txt`);
    
    const targetDate = new Date(toDate);
    const targetDateStr = targetDate.toISOString().split('T')[0].replace(/-/g, '');
    const targetPath = path.join(CALENDAR_DIR, `${targetDateStr}.txt`);

    try {
      // Read source file
      const sourceContent = await fs.readFile(sourceTargetPath, 'utf-8');
      const sourceLines = sourceContent.split('\n');
      
      let foundCount = 0;
      let taskLineIndex = -1;
      let originalTaskText = '';
      
      // Find the task in source
      for (let i = 0; i < sourceLines.length; i++) {
        const line = sourceLines[i];
        if ((line.match(/^\s*[*+]\s+/) && line.includes(taskQuery))) {
          foundCount++;
          if (foundCount === occurrence) {
            taskLineIndex = i;
            // Extract the task text without prefix and scheduling info
            const match = line.match(/^(\s*[*+]\s+)(.+?)(\s*[<>]\d{4}-\d{2}-\d{2})?$/);
            if (match) {
              originalTaskText = match[2].trim();
            }
            break;
          }
        }
      }
      
      if (taskLineIndex === -1) {
        return {
          content: [
            {
              type: 'text',
              text: `Task containing "${taskQuery}" not found in ${fromDate || 'today'} (occurrence ${occurrence})`,
            },
          ],
        };
      }
      
      // Update source task to show it was moved
      const sourceTaskPrefix = sourceLines[taskLineIndex].match(/^(\s*[*+]\s+)/)?.[0] || '* ';
      sourceLines[taskLineIndex] = `${sourceTaskPrefix}[>] ${originalTaskText} >${toDate}`;
      
      // Write updated source file
      await fs.writeFile(sourceTargetPath, sourceLines.join('\n'), 'utf-8');
      
      // Read or create target file
      let targetContent = '';
      try {
        targetContent = await fs.readFile(targetPath, 'utf-8');
      } catch {
        // Target file doesn't exist, create it
        targetContent = '';
      }
      
      // Add task to target file with original date reference
      const newTaskLine = `* ${originalTaskText} <${fromDate || sourceDate.toISOString().split('T')[0]}`;
      const updatedTargetContent = targetContent.trim() 
        ? `${targetContent}\n${newTaskLine}` 
        : newTaskLine;
      
      await fs.writeFile(targetPath, updatedTargetContent, 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: `Task "${originalTaskText}" rescheduled from ${fromDate || sourceDate.toISOString().split('T')[0]} to ${toDate}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error rescheduling task: ${error}`,
          },
        ],
      };
    }
  }

  private async createFromTemplate(
    templateName: string,
    targetPath?: string,
    targetName?: string,
    variables?: Record<string, string>
  ) {
    const templatesDir = path.join(NOTES_DIR, '@Templates');
    
    // Find the template file (try both .txt and .md extensions)
    let templateFile: string | null = null;
    let templateContent: string = '';
    
    for (const ext of ['.txt', '.md']) {
      const testPath = path.join(templatesDir, `${templateName}${ext}`);
      try {
        templateContent = await fs.readFile(testPath, 'utf-8');
        templateFile = testPath;
        break;
      } catch {
        // Try next extension
      }
    }
    
    if (!templateFile) {
      return {
        content: [
          {
            type: 'text',
            text: `Template "${templateName}" not found in @Templates folder`,
          },
        ],
      };
    }
    
    // Prepare built-in variables
    const now = new Date();
    const builtInVars: Record<string, string> = {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].slice(0, 5),
      datetime: now.toISOString(),
      year: now.getFullYear().toString(),
      month: (now.getMonth() + 1).toString().padStart(2, '0'),
      day: now.getDate().toString().padStart(2, '0'),
      weekday: now.toLocaleDateString('en-US', { weekday: 'long' }),
      title: targetName || 'Untitled',
    };
    
    // Merge user variables with built-in ones
    const allVariables = { ...builtInVars, ...variables };
    
    // Replace variables in template content
    let processedContent = templateContent;
    for (const [key, value] of Object.entries(allVariables)) {
      // Replace {{variable}} pattern
      processedContent = processedContent.replace(
        new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'),
        value
      );
    }
    
    // Determine target file path
    let targetFilePath: string;
    if (targetName) {
      // Ensure file has extension
      const fileName = targetName.match(/\.(txt|md)$/) ? targetName : `${targetName}.txt`;
      targetFilePath = targetPath 
        ? path.join(NOTES_DIR, targetPath, fileName)
        : path.join(NOTES_DIR, fileName);
    } else {
      // Auto-generate filename based on template name and date
      const fileName = `${templateName}-${builtInVars.date}.txt`;
      targetFilePath = targetPath 
        ? path.join(NOTES_DIR, targetPath, fileName)
        : path.join(NOTES_DIR, fileName);
    }
    
    // Check if target already exists
    try {
      await fs.access(targetFilePath);
      return {
        content: [
          {
            type: 'text',
            text: `Error: File already exists at ${path.relative(NOTES_DIR, targetFilePath)}`,
          },
        ],
      };
    } catch {
      // File doesn't exist, good to proceed
    }
    
    // Create directory if needed
    const targetDir = path.dirname(targetFilePath);
    try {
      await fs.mkdir(targetDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
    }
    
    // Write the new note
    try {
      await fs.writeFile(targetFilePath, processedContent, 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Created note from template "${templateName}"\n📄 Location: ${path.relative(NOTES_DIR, targetFilePath)}\n\nVariables replaced:\n${Object.entries(allVariables).map(([k, v]) => `  • {{${k}}} → ${v}`).join('\n')}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error creating note from template: ${error}`,
          },
        ],
      };
    }
  }

  private async listTemplates() {
    const templatesDir = path.join(NOTES_DIR, '@Templates');
    
    try {
      const files = await fs.readdir(templatesDir);
      const templates = [];
      
      for (const file of files) {
        if (file.endsWith('.txt') || file.endsWith('.md')) {
          const filePath = path.join(templatesDir, file);
          try {
            // Read first few lines to get description
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n').slice(0, 3);
            const firstLine = lines[0]?.trim() || '';
            
            // Extract template name without extension
            const templateName = file.replace(/\.(txt|md)$/, '');
            
            templates.push({
              name: templateName,
              fileName: file,
              description: firstLine.startsWith('#') ? firstLine.replace(/^#+\s*/, '') : firstLine,
              path: path.relative(NOTES_DIR, filePath),
            });
          } catch (error) {
            // Skip files that can't be read
            console.error(`Error reading template ${file}:`, error);
          }
        }
      }
      
      templates.sort((a, b) => a.name.localeCompare(b.name));
      
      const templateList = templates.map(t => 
        `📄 **${t.name}**${t.description ? `\n   ${t.description}` : ''}`
      ).join('\n\n');
      
      return {
        content: [
          {
            type: 'text',
            text: templates.length > 0 
              ? `Found ${templates.length} templates in @Templates:\n\n${templateList}`
              : 'No templates found in @Templates folder',
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error accessing templates: ${error}`,
          },
        ],
      };
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private getQuarter(month: number): number {
    return Math.ceil(month / 3);
  }

  private async readWeeklyNote(year?: number, week?: number) {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetWeek = week || this.getWeekNumber(now);
    
    // Format: YYYY-WNN (e.g., 2024-W29)
    const weekStr = targetWeek.toString().padStart(2, '0');
    const noteFileName = `${targetYear}-W${weekStr}.txt`;
    const notePath = path.join(CALENDAR_DIR, noteFileName);
    
    try {
      const content = await fs.readFile(notePath, 'utf-8');
      return await this.processContentWithImages(
        content, 
        `Weekly note for ${targetYear} Week ${targetWeek}:\n\n`, 
        CALENDAR_DIR
      );
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `No weekly note found for ${targetYear} Week ${targetWeek} (${noteFileName})`,
          },
        ],
      };
    }
  }

  private async readMonthlyNote(year?: number, month?: number) {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || (now.getMonth() + 1);
    
    // Validate month
    if (targetMonth < 1 || targetMonth > 12) {
      return {
        content: [
          {
            type: 'text',
            text: `Invalid month number: ${targetMonth}. Please use 1-12.`,
          },
        ],
      };
    }
    
    // Format: YYYY-MM (e.g., 2024-07)
    const monthStr = targetMonth.toString().padStart(2, '0');
    const noteFileName = `${targetYear}-${monthStr}.txt`;
    const notePath = path.join(CALENDAR_DIR, noteFileName);
    
    try {
      const content = await fs.readFile(notePath, 'utf-8');
      const monthName = new Date(targetYear, targetMonth - 1).toLocaleString('en-US', { month: 'long' });
      return await this.processContentWithImages(
        content, 
        `Monthly note for ${monthName} ${targetYear}:\n\n`, 
        CALENDAR_DIR
      );
    } catch (error) {
      const monthName = new Date(targetYear, targetMonth - 1).toLocaleString('en-US', { month: 'long' });
      return {
        content: [
          {
            type: 'text',
            text: `No monthly note found for ${monthName} ${targetYear} (${noteFileName})`,
          },
        ],
      };
    }
  }

  private async readQuarterlyNote(year?: number, quarter?: number) {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const currentQuarter = this.getQuarter(now.getMonth() + 1);
    const targetQuarter = quarter || currentQuarter;
    
    // Validate quarter
    if (targetQuarter < 1 || targetQuarter > 4) {
      return {
        content: [
          {
            type: 'text',
            text: `Invalid quarter number: ${targetQuarter}. Please use 1-4.`,
          },
        ],
      };
    }
    
    // Format: YYYY-QN (e.g., 2024-Q3)
    const noteFileName = `${targetYear}-Q${targetQuarter}.txt`;
    const notePath = path.join(CALENDAR_DIR, noteFileName);
    
    try {
      const content = await fs.readFile(notePath, 'utf-8');
      return await this.processContentWithImages(
        content, 
        `Quarterly note for ${targetYear} Q${targetQuarter}:\n\n`, 
        CALENDAR_DIR
      );
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `No quarterly note found for ${targetYear} Q${targetQuarter} (${noteFileName})`,
          },
        ],
      };
    }
  }

  private async findTasksInFile(
    filePath: string,
    criteria: any
  ): Promise<Array<{ lineIndex: number; line: string; taskText: string; isCompleted: boolean }>> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const tasks: Array<{ lineIndex: number; line: string; taskText: string; isCompleted: boolean }> = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const taskMatch = line.match(/^\s*[*+]\s+(.+)$/);
        
        if (taskMatch) {
          const taskText = taskMatch[1].trim();
          const isCompleted = line.includes('[x]') || line.includes('[X]');
          
          // Skip completed tasks
          if (isCompleted) continue;
          
          // Apply text filter
          if (criteria.containing && !taskText.toLowerCase().includes(criteria.containing.toLowerCase())) {
            continue;
          }
          
          // Apply project filter
          if (criteria.project && !taskText.includes(criteria.project)) {
            continue;
          }
          
          tasks.push({ lineIndex: i, line, taskText, isCompleted });
        }
      }
      
      return tasks;
    } catch (error) {
      // File doesn't exist or can't be read
      return [];
    }
  }

  private async bulkRescheduleTasks(
    criteria: any,
    toDate: string,
    preserveOriginalDate: boolean = true,
    dryRun: boolean = false
  ) {
    const targetDate = new Date(toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Collect all tasks to reschedule
    const tasksToMove: Array<{
      sourceFile: string;
      sourceDate: string;
      tasks: Array<{ lineIndex: number; line: string; taskText: string; isCompleted: boolean }>;
    }> = [];
    
    // Determine which dates to check based on criteria
    const datesToCheck: string[] = [];
    
    if (criteria.overdue) {
      // Get all dates before today
      const files = await fs.readdir(CALENDAR_DIR);
      for (const file of files) {
        const dateMatch = file.match(/^(\d{8})\.txt$/);
        if (dateMatch) {
          const fileDate = new Date(
            dateMatch[1].slice(0, 4) + '-' + 
            dateMatch[1].slice(4, 6) + '-' + 
            dateMatch[1].slice(6, 8)
          );
          if (fileDate < today) {
            datesToCheck.push(dateMatch[1].slice(0, 4) + '-' + dateMatch[1].slice(4, 6) + '-' + dateMatch[1].slice(6, 8));
          }
        }
      }
    } else if (criteria.fromDate) {
      datesToCheck.push(criteria.fromDate);
    } else if (criteria.dateRange) {
      // Generate all dates in range
      const startDate = new Date(criteria.dateRange.start);
      const endDate = new Date(criteria.dateRange.end);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        datesToCheck.push(d.toISOString().split('T')[0]);
      }
    } else {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Please specify criteria (overdue, fromDate, or dateRange)',
          },
        ],
      };
    }
    
    // Find tasks in each date
    for (const dateStr of datesToCheck) {
      const dateStrCompact = dateStr.replace(/-/g, '');
      const filePath = path.join(CALENDAR_DIR, `${dateStrCompact}.txt`);
      const tasks = await this.findTasksInFile(filePath, criteria);
      
      if (tasks.length > 0) {
        tasksToMove.push({
          sourceFile: filePath,
          sourceDate: dateStr,
          tasks,
        });
      }
    }
    
    // Calculate total tasks
    const totalTasks = tasksToMove.reduce((sum, file) => sum + file.tasks.length, 0);
    
    if (totalTasks === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No matching tasks found to reschedule',
          },
        ],
      };
    }
    
    if (dryRun) {
      // Preview mode
      const preview = tasksToMove.map(file => 
        `📅 From ${file.sourceDate}:\n` +
        file.tasks.map(t => `  • ${t.taskText}`).join('\n')
      ).join('\n\n');
      
      return {
        content: [
          {
            type: 'text',
            text: `🔍 DRY RUN - Found ${totalTasks} tasks to move to ${toDate}:\n\n${preview}\n\n⚠️ No changes made (dry run mode)`,
          },
        ],
      };
    }
    
    // Perform the actual rescheduling
    let movedCount = 0;
    const errors: string[] = [];
    
    // Prepare target file
    const targetDateStr = targetDate.toISOString().split('T')[0].replace(/-/g, '');
    const targetPath = path.join(CALENDAR_DIR, `${targetDateStr}.txt`);
    
    // Read existing target content
    let targetContent = '';
    try {
      targetContent = await fs.readFile(targetPath, 'utf-8');
      if (!targetContent.endsWith('\n')) targetContent += '\n';
    } catch {
      // Target file doesn't exist yet
    }
    
    // Process each source file
    for (const fileData of tasksToMove) {
      try {
        // Read source file
        const content = await fs.readFile(fileData.sourceFile, 'utf-8');
        const lines = content.split('\n');
        
        // Mark tasks as moved in source
        for (const task of fileData.tasks.reverse()) { // Reverse to maintain indices
          const prefix = lines[task.lineIndex].match(/^(\s*[*+]\s+)/)?.[0] || '* ';
          lines[task.lineIndex] = `${prefix}[>] ${task.taskText} >${toDate}`;
          
          // Add to target
          const newTaskLine = preserveOriginalDate 
            ? `* ${task.taskText} <${fileData.sourceDate}`
            : `* ${task.taskText}`;
          targetContent += `${newTaskLine}\n`;
          movedCount++;
        }
        
        // Write updated source file
        await fs.writeFile(fileData.sourceFile, lines.join('\n'), 'utf-8');
      } catch (error) {
        errors.push(`Error processing ${fileData.sourceDate}: ${error}`);
      }
    }
    
    // Write target file
    try {
      await fs.writeFile(targetPath, targetContent.trimEnd() + '\n', 'utf-8');
    } catch (error) {
      errors.push(`Error writing target file: ${error}`);
    }
    
    const summary = `✅ Bulk reschedule completed:\n` +
      `• Moved ${movedCount} tasks to ${toDate}\n` +
      `• From ${tasksToMove.length} different dates\n` +
      (preserveOriginalDate ? '• Original dates preserved' : '• Original dates not preserved') +
      (errors.length > 0 ? `\n\n⚠️ Errors:\n${errors.join('\n')}` : '');
    
    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
      ],
    };
  }

  private async removeTextFromNote(
    textToRemove: string,
    date?: string,
    notePath?: string,
    removeAll: boolean = false
  ) {
    let targetPath: string;
    
    if (notePath) {
      // Check if it's a calendar path (weekly, monthly, quarterly notes)
      if (notePath.match(/^\d{4}-[WMQ]\d+\.txt$/) || notePath.startsWith('Calendar/')) {
        // Remove 'Calendar/' prefix if present
        const cleanPath = notePath.replace(/^Calendar\//, '');
        targetPath = path.join(CALENDAR_DIR, cleanPath);
      } else {
        targetPath = path.join(NOTES_DIR, notePath);
      }
    } else {
      const targetDate = date ? new Date(date) : new Date();
      const dateStr = targetDate.toISOString().split('T')[0].replace(/-/g, '');
      targetPath = path.join(CALENDAR_DIR, `${dateStr}.txt`);
    }

    try {
      const content = await fs.readFile(targetPath, 'utf-8');
      
      let updatedContent: string;
      let removedCount = 0;
      
      if (removeAll) {
        // Remove all occurrences
        const originalLength = content.split(textToRemove).length - 1;
        updatedContent = content.split(textToRemove).join('');
        removedCount = originalLength;
      } else {
        // Remove first occurrence only
        const index = content.indexOf(textToRemove);
        if (index !== -1) {
          updatedContent = content.substring(0, index) + content.substring(index + textToRemove.length);
          removedCount = 1;
        } else {
          updatedContent = content;
        }
      }
      
      if (removedCount === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `Text "${textToRemove}" not found in the note`,
            },
          ],
        };
      }
      
      await fs.writeFile(targetPath, updatedContent, 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully removed ${removedCount} occurrence${removedCount > 1 ? 's' : ''} of "${textToRemove}"`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error removing text from note: ${error}`,
          },
        ],
      };
    }
  }

  private async replaceTextInNote(
    oldText: string,
    newText: string,
    date?: string,
    notePath?: string,
    replaceAll: boolean = false
  ) {
    let targetPath: string;
    
    if (notePath) {
      // Check if it's a calendar path (weekly, monthly, quarterly notes)
      if (notePath.match(/^\d{4}-[WMQ]\d+\.txt$/) || notePath.startsWith('Calendar/')) {
        // Remove 'Calendar/' prefix if present
        const cleanPath = notePath.replace(/^Calendar\//, '');
        targetPath = path.join(CALENDAR_DIR, cleanPath);
      } else {
        targetPath = path.join(NOTES_DIR, notePath);
      }
    } else {
      const targetDate = date ? new Date(date) : new Date();
      const dateStr = targetDate.toISOString().split('T')[0].replace(/-/g, '');
      targetPath = path.join(CALENDAR_DIR, `${dateStr}.txt`);
    }

    try {
      const content = await fs.readFile(targetPath, 'utf-8');
      
      let updatedContent: string;
      let replacedCount = 0;
      
      if (replaceAll) {
        // Replace all occurrences
        const originalLength = content.split(oldText).length - 1;
        updatedContent = content.split(oldText).join(newText);
        replacedCount = originalLength;
      } else {
        // Replace first occurrence only
        const index = content.indexOf(oldText);
        if (index !== -1) {
          updatedContent = content.substring(0, index) + newText + content.substring(index + oldText.length);
          replacedCount = 1;
        } else {
          updatedContent = content;
        }
      }
      
      if (replacedCount === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `Text "${oldText}" not found in the note`,
            },
          ],
        };
      }
      
      await fs.writeFile(targetPath, updatedContent, 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully replaced ${replacedCount} occurrence${replacedCount > 1 ? 's' : ''} of "${oldText}" with "${newText}"`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error replacing text in note: ${error}`,
          },
        ],
      };
    }
  }

  async run() {
    // Validate NotePlan directories exist
    try {
      await fs.access(NOTEPLAN_BASE);
      await fs.access(NOTES_DIR);
      await fs.access(CALENDAR_DIR);
    } catch (error) {
      console.error('NotePlan directory not found. Please ensure NotePlan is installed.');
      console.error(`Expected location: ${NOTEPLAN_BASE}`);
      console.error('You can override this with NOTEPLAN_BASE_PATH environment variable.');
      process.exit(1);
    }
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Don't output to stderr after connection - it interferes with MCP protocol
  }
}

const server = new NotePlanServer();
server.run().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});