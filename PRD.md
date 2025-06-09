# Product Requirements Document (PRD)
## NotePlan MCP Server Enhanced Features

**Version:** 1.0  
**Date:** 2025-05-31  
**Author:** NotePlan MCP Development Team

---

## 📋 Executive Summary

This PRD outlines the planned enhancements for the NotePlan MCP Server to transform it from a basic CRUD interface into a comprehensive productivity powerhouse. The features are organized into three phases based on impact and implementation complexity.

---

## 🎯 Phase 1: Essential Productivity Features
*High Impact, Low Effort - Target: v1.2.0*

### 1.1 Template Management

#### **1.1.1 List Templates** ✅ **COMPLETED (v1.2.0)**
- **Method:** `list_templates`
- **Description:** Browse all available templates in the @Templates folder
- **Returns:** List of template names, descriptions (from first line), and file paths
- **Priority:** P0
- **Implementation Notes:**
  - Supports both .txt and .md files
  - Shows formatted list with descriptions
  - Handles empty templates folder gracefully

#### **1.1.2 Create From Template** ✅ **COMPLETED (v1.2.0)**
- **Method:** `create_from_template`
- **Description:** Create a new note based on a template with variable substitution
- **Parameters:**
  - `templateName`: Name of the template to use (without extension)
  - `targetPath`: Where to create the new note (optional, defaults to Notes/)
  - `targetName`: Name for the new note (optional, auto-generated if not provided)
  - `variables`: Key-value pairs for template variable replacement
- **Features:**
  - Replace `{{date}}`, `{{time}}`, `{{datetime}}`, `{{year}}`, `{{month}}`, `{{day}}`, `{{weekday}}`, `{{title}}` placeholders
  - Support custom variables
  - Auto-generate filename as `template-name-YYYY-MM-DD.txt` if not provided
- **Priority:** P0
- **Implementation Notes:**
  - Creates directories automatically if needed
  - Prevents overwriting existing files
  - Shows all variable replacements in response
  - Works with both .txt and .md templates

#### **1.1.3 Save As Template** ⏳ **PENDING**
- **Method:** `save_as_template`
- **Description:** Convert an existing note into a reusable template
- **Parameters:**
  - `notePath`: Path to the note to templatize
  - `templateName`: Name for the new template
  - `variables`: List of text patterns to convert to variables
- **Priority:** P1

### 1.2 Period Note Management

#### **1.2.1 Read Weekly Note** ✅ **COMPLETED (v1.2.0)**
- **Method:** `read_weekly_note`
- **Description:** Access weekly planning notes (YYYY-WNN format)
- **Parameters:**
  - `year`: Year (optional, defaults to current)
  - `week`: Week number (optional, defaults to current)
- **Priority:** P0
- **Implementation Notes:**
  - Proper ISO week number calculation
  - Supports image attachments
  - Clear error messages for missing notes

#### **1.2.2 Read Monthly Note** ✅ **COMPLETED (v1.2.0)**
- **Method:** `read_monthly_note`
- **Description:** Access monthly review notes (YYYY-MM format)
- **Parameters:**
  - `year`: Year (optional, defaults to current)
  - `month`: Month number (optional, defaults to current)
- **Priority:** P0
- **Implementation Notes:**
  - Validates month range (1-12)
  - Shows month name in output
  - Handles missing notes gracefully

#### **1.2.3 Read Quarterly Note** ✅ **COMPLETED (v1.2.0)**
- **Method:** `read_quarterly_note`
- **Description:** Access quarterly planning notes (YYYY-QN format)
- **Parameters:**
  - `year`: Year (optional, defaults to current)
  - `quarter`: Quarter number (optional, defaults to current)
- **Priority:** P1
- **Implementation Notes:**
  - Validates quarter range (1-4)
  - Auto-calculates current quarter
  - Consistent error handling

#### **1.2.4 Create Period Note** ⏳ **PENDING**
- **Method:** `create_period_note`
- **Description:** Generate weekly/monthly/quarterly notes from templates
- **Parameters:**
  - `period`: Type ('weekly', 'monthly', 'quarterly')
  - `date`: Target date (optional, defaults to current)
  - `template`: Template to use (optional)
- **Priority:** P1

### 1.3 Bulk Task Operations

#### **1.3.1 Bulk Reschedule Tasks** ✅ **COMPLETED (v1.2.0)**
- **Method:** `bulk_reschedule_tasks`
- **Description:** Move multiple tasks matching criteria to a new date
- **Parameters:**
  - `criteria`: Object with filters:
    - `overdue`: Select all tasks before today
    - `fromDate`: Tasks from specific date
    - `dateRange`: Tasks within date range
    - `containing`: Text search filter
    - `project`: Project/tag filter
  - `toDate`: Target date for all matching tasks
  - `preserveOriginalDate`: Whether to keep <date> references (default: true)
  - `dryRun`: Preview mode without changes (default: false)
- **Use Cases:**
  - Move all overdue tasks to today
  - Reschedule all tasks from a specific project
  - Clear out a day by moving everything forward
- **Priority:** P0
- **Implementation Notes:**
  - Supports multiple filter criteria simultaneously
  - Processes tasks from multiple source dates in one operation
  - Maintains NotePlan's task movement format (`[>]` and `<date>`)
  - Skips completed tasks automatically

#### **1.3.2 Archive Completed Tasks**
- **Method:** `archive_completed_tasks`
- **Description:** Move completed tasks to an archive file
- **Parameters:**
  - `dateRange`: Range of dates to process (optional, defaults to all)
  - `archiveLocation`: Where to store archived tasks
  - `keepDays`: Keep completed tasks for N days before archiving
- **Priority:** P1

#### **1.3.3 Clean Duplicate Tasks**
- **Method:** `clean_duplicate_tasks`
- **Description:** Find and merge duplicate or similar tasks
- **Parameters:**
  - `similarity`: Threshold for considering tasks duplicate (0-1)
  - `scope`: Where to search (calendar, notes, or both)
  - `action`: What to do with duplicates (merge, delete, report)
- **Priority:** P2

---

## 🧠 Phase 2: Intelligence Layer
*High Impact, Medium Effort - Target: v1.3.0*

### 2.1 Advanced Search & Analytics

#### **2.1.1 Search by Date Range**
- **Method:** `search_date_range`
- **Description:** Find notes and tasks within a specific time period
- **Parameters:**
  - `startDate`: Beginning of range
  - `endDate`: End of range
  - `query`: Optional text search within range
  - `includeArchived`: Include archived content
- **Priority:** P0

#### **2.1.2 Get Task Statistics**
- **Method:** `get_task_statistics`
- **Description:** Analyze task completion patterns and productivity metrics
- **Parameters:**
  - `dateRange`: Period to analyze
  - `groupBy`: How to group data (day, week, month, project)
- **Returns:**
  - Completion rate
  - Average tasks per period
  - Most productive times
  - Frequently rescheduled tasks
- **Priority:** P0

#### **2.1.3 Find Overdue Tasks**
- **Method:** `find_overdue_tasks`
- **Description:** Identify all tasks past their scheduled date
- **Parameters:**
  - `includeToday`: Whether to include today's uncompleted tasks
  - `groupBy`: How to group results (date, project, age)
- **Priority:** P1

#### **2.1.4 Get Habit Tracking**
- **Method:** `get_habit_tracking`
- **Description:** Analyze recurring tasks and habit streaks
- **Parameters:**
  - `habitPattern`: Text pattern to identify habit tasks
  - `dateRange`: Period to analyze
- **Returns:**
  - Current streak
  - Longest streak
  - Completion percentage
  - Pattern analysis
- **Priority:** P2

### 2.2 Attachment Management

#### **2.2.1 List Attachments**
- **Method:** `list_attachments`
- **Description:** Browse all attachments across notes
- **Parameters:**
  - `filter`: Filter by type, size, or date
  - `orphanedOnly`: Only show unlinked attachments
- **Priority:** P1

#### **2.2.2 Find Orphaned Attachments**
- **Method:** `find_orphaned_attachments`
- **Description:** Identify attachments not referenced in any note
- **Returns:** List of orphaned files with paths and sizes
- **Priority:** P1

#### **2.2.3 Attachment Usage Report**
- **Method:** `attachment_usage_report`
- **Description:** Show which notes use which attachments
- **Returns:** Map of attachments to their referencing notes
- **Priority:** P2

### 2.3 Note Organization

#### **2.3.1 Move Note**
- **Method:** `move_note`
- **Description:** Relocate notes between folders
- **Parameters:**
  - `sourcePath`: Current note location
  - `targetFolder`: Destination folder
  - `updateLinks`: Update internal links to reflect new location
- **Priority:** P0

#### **2.3.2 Duplicate Note**
- **Method:** `duplicate_note`
- **Description:** Create a copy of a note with optional modifications
- **Parameters:**
  - `sourcePath`: Note to duplicate
  - `targetPath`: Where to create the copy
  - `replacements`: Key-value pairs for text substitution
- **Priority:** P1

#### **2.3.3 Find Related Notes**
- **Method:** `find_related_notes`
- **Description:** Discover notes with similar content or links
- **Parameters:**
  - `notePath`: Reference note
  - `similarity`: Threshold for relevance (0-1)
  - `maxResults`: Maximum number of results
- **Priority:** P2

---

## 🤖 Phase 3: Automation & Advanced Features
*High Impact, High Effort - Target: v1.4.0*

### 3.1 Workflow Automation

#### **3.1.1 Create Recurring Note**
- **Method:** `create_recurring_note`
- **Description:** Set up automatically generated notes on a schedule
- **Parameters:**
  - `template`: Template to use
  - `schedule`: Cron expression or preset (daily, weekly, monthly)
  - `variables`: Dynamic variables to inject
- **Priority:** P1

#### **3.1.2 Extract Action Items**
- **Method:** `extract_action_items`
- **Description:** Parse meeting notes and create tasks automatically
- **Parameters:**
  - `notePath`: Note to process
  - `patterns`: Custom patterns for task detection
  - `targetDate`: Where to add extracted tasks
- **Priority:** P1

#### **3.1.3 Process Email to Note**
- **Method:** `process_email_to_note`
- **Description:** Convert email content into structured notes
- **Parameters:**
  - `emailContent`: Raw email text
  - `extractAttachments`: Whether to save attachments
  - `categorize`: Auto-categorize based on sender/subject
- **Priority:** P2

### 3.2 Analytics Dashboard

#### **3.2.1 Generate Productivity Report**
- **Method:** `generate_productivity_report`
- **Description:** Comprehensive analysis of productivity patterns
- **Parameters:**
  - `period`: Time period to analyze
  - `metrics`: Which metrics to include
  - `format`: Output format (markdown, json, html)
- **Returns:**
  - Task completion trends
  - Time allocation by project
  - Energy patterns
  - Recommendations
- **Priority:** P1

#### **3.2.2 Project Health Check**
- **Method:** `project_health_check`
- **Description:** Analyze project status and identify risks
- **Parameters:**
  - `projectPath`: Project folder or tag
  - `criteria`: Health check criteria
- **Returns:**
  - Task velocity
  - Overdue items
  - Stalled indicators
  - Completion forecast
- **Priority:** P2

### 3.3 Integration Features

#### **3.3.1 Export Time Blocks**
- **Method:** `export_time_blocks`
- **Description:** Export scheduled tasks to calendar format
- **Parameters:**
  - `dateRange`: Period to export
  - `format`: iCal, Google Calendar, or JSON
  - `includeCompleted`: Whether to include done tasks
- **Priority:** P2

#### **3.3.2 Sync External Tasks**
- **Method:** `sync_external_tasks`
- **Description:** Import tasks from external systems
- **Parameters:**
  - `source`: Source system (Todoist, Trello, etc.)
  - `mapping`: Field mapping configuration
  - `syncMode`: One-way or two-way sync
- **Priority:** P3

---

## 📊 Success Metrics

### Phase 1 Success Criteria
- Reduce time spent on task management by 30%
- Enable batch operations on 10+ tasks simultaneously
- Template usage adoption by 80% of users

### Phase 2 Success Criteria
- Improve task completion rate by 20%
- Reduce orphaned attachments by 90%
- Enable data-driven productivity insights

### Phase 3 Success Criteria
- Automate 50% of routine note creation
- Reduce manual task extraction time by 80%
- Enable seamless integration with 3+ external tools

---

## 🚀 Implementation Plan

### Version 1.2.0 (Phase 1) - 2 weeks
- ✅ **COMPLETED**: Template management (list_templates, create_from_template)
- ⏳ **IN PROGRESS**: Period notes
- ⏳ **PENDING**: save_as_template, Bulk operations + Testing

### Version 1.3.0 (Phase 2) - 3 weeks
- Week 1: Advanced search + Basic analytics
- Week 2: Attachment management
- Week 3: Note organization + Testing

### Version 1.4.0 (Phase 3) - 4 weeks
- Week 1-2: Workflow automation
- Week 3: Analytics dashboard
- Week 4: Integration features + Testing

## 📈 Progress Tracker

### Phase 1 Features (v1.2.0)
- [x] list_templates
- [x] create_from_template
- [ ] save_as_template
- [x] read_weekly_note
- [x] read_monthly_note
- [x] read_quarterly_note
- [ ] create_period_note
- [x] bulk_reschedule_tasks
- [ ] archive_completed_tasks
- [ ] clean_duplicate_tasks

---

## 🔧 Technical Considerations

### Performance
- Batch operations should handle 1000+ items
- Search operations should complete in <2 seconds
- Analytics should cache results for repeated queries

### Data Integrity
- All bulk operations must be reversible
- Archive operations must preserve original timestamps
- Template operations must validate variable substitution

### Compatibility
- Maintain backward compatibility with existing methods
- Ensure all new features work with NotePlan's native functionality
- Support NotePlan's existing file format and structure

---

## 📝 Notes

- Priority levels: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
- Each feature should include comprehensive error handling
- All methods should support the MCP protocol standards
- Documentation should include examples for each method

---

**Next Steps:** Begin implementation with Phase 1, starting with template management functionality.