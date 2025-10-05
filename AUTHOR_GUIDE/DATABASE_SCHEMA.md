# Author - Database Schema

## Overview

The Author application uses SQLite as its primary local database for storing project metadata, user preferences, and application state. The database is designed to be lightweight, fast, and suitable for single-user desktop applications with optional multi-user collaboration features.

## Database Design Principles

- **Local-First**: All data stored locally for privacy and offline access
- **Performance**: Optimized for fast queries and minimal storage overhead
- **Flexibility**: Schema supports various project types and extensible metadata
- **Integrity**: Foreign key constraints and data validation
- **Versioning**: Schema versioning for smooth application updates

## Core Tables

### Projects Table
```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('novel', 'non-fiction', 'screenplay', 'academic', 'poetry', 'other')),
    description TEXT,
    genre TEXT,
    target_word_count INTEGER DEFAULT 0,
    current_word_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived', 'deleted')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deadline DATETIME,
    project_path TEXT NOT NULL UNIQUE,
    settings JSON,
    metadata JSON,
    FOREIGN KEY (id) REFERENCES project_statistics(project_id)
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_type ON projects(type);
CREATE INDEX idx_projects_updated_at ON projects(updated_at);
```

### Project Structure Table
```sql
CREATE TABLE project_structure (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    parent_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('folder', 'chapter', 'scene', 'character', 'location', 'note', 'research')),
    position INTEGER NOT NULL DEFAULT 0,
    file_path TEXT,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES project_structure(id) ON DELETE CASCADE
);

CREATE INDEX idx_structure_project ON project_structure(project_id);
CREATE INDEX idx_structure_parent ON project_structure(parent_id);
CREATE INDEX idx_structure_type ON project_structure(type);
CREATE UNIQUE INDEX idx_structure_position ON project_structure(project_id, parent_id, position);
```

### Files Table
```sql
CREATE TABLE files (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    structure_id TEXT,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('chapter', 'scene', 'character', 'location', 'note', 'research', 'other')),
    content_hash TEXT,
    word_count INTEGER DEFAULT 0,
    character_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in-progress', 'review', 'complete')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    tags JSON,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (structure_id) REFERENCES project_structure(id) ON DELETE SET NULL
);

CREATE INDEX idx_files_project ON files(project_id);
CREATE INDEX idx_files_type ON files(type);
CREATE INDEX idx_files_status ON files(status);
CREATE INDEX idx_files_updated_at ON files(updated_at);
CREATE UNIQUE INDEX idx_files_path ON files(project_id, file_path);
```

### File Versions Table
```sql
CREATE TABLE file_versions (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    character_count INTEGER DEFAULT 0,
    change_summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    backup_path TEXT,
    metadata JSON,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE INDEX idx_versions_file ON file_versions(file_id);
CREATE INDEX idx_versions_created_at ON file_versions(created_at);
CREATE UNIQUE INDEX idx_versions_file_number ON file_versions(file_id, version_number);
```

## Character and World Building Tables

### Characters Table
```sql
CREATE TABLE characters (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT,
    description TEXT,
    personality JSON,
    background TEXT,
    goals JSON,
    conflicts JSON,
    appearance TEXT,
    age INTEGER,
    gender TEXT,
    role TEXT CHECK (role IN ('protagonist', 'antagonist', 'supporting', 'minor')),
    first_appearance TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deceased')),
    notes TEXT,
    image_path TEXT,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_characters_project ON characters(project_id);
CREATE INDEX idx_characters_role ON characters(role);
CREATE INDEX idx_characters_status ON characters(status);
```

### Character Relationships Table
```sql
CREATE TABLE character_relationships (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    character_a_id TEXT NOT NULL,
    character_b_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    description TEXT,
    strength INTEGER DEFAULT 5 CHECK (strength >= 1 AND strength <= 10),
    status TEXT DEFAULT 'current' CHECK (status IN ('past', 'current', 'future')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (character_a_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (character_b_id) REFERENCES characters(id) ON DELETE CASCADE,
    CHECK (character_a_id != character_b_id)
);

CREATE INDEX idx_relationships_project ON character_relationships(project_id);
CREATE INDEX idx_relationships_char_a ON character_relationships(character_a_id);
CREATE INDEX idx_relationships_char_b ON character_relationships(character_b_id);
CREATE UNIQUE INDEX idx_relationships_unique ON character_relationships(character_a_id, character_b_id, relationship_type);
```

### Locations Table
```sql
CREATE TABLE locations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('country', 'city', 'building', 'room', 'natural', 'fictional', 'other')),
    description TEXT,
    geography TEXT,
    climate TEXT,
    culture TEXT,
    history TEXT,
    significance TEXT,
    parent_location_id TEXT,
    coordinates TEXT,
    image_path TEXT,
    notes TEXT,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE INDEX idx_locations_project ON locations(project_id);
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_parent ON locations(parent_location_id);
```

## Timeline and Events Tables

### Timeline Table
```sql
CREATE TABLE timelines (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_date TEXT,
    end_date TEXT,
    timeline_type TEXT DEFAULT 'story' CHECK (timeline_type IN ('story', 'historical', 'character', 'world')),
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_timelines_project ON timelines(project_id);
CREATE INDEX idx_timelines_type ON timelines(timeline_type);
```

### Events Table
```sql
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    timeline_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    event_date TEXT,
    duration TEXT,
    event_type TEXT CHECK (event_type IN ('plot', 'character', 'historical', 'world', 'other')),
    importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
    characters JSON,
    locations JSON,
    consequences TEXT,
    notes TEXT,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE SET NULL
);

CREATE INDEX idx_events_project ON events(project_id);
CREATE INDEX idx_events_timeline ON events(timeline_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_date ON events(event_date);
```

## Research and Reference Tables

### Research Notes Table
```sql
CREATE TABLE research_notes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    tags JSON,
    source_url TEXT,
    source_title TEXT,
    source_author TEXT,
    source_date TEXT,
    credibility INTEGER DEFAULT 5 CHECK (credibility >= 1 AND credibility <= 10),
    relevance INTEGER DEFAULT 5 CHECK (relevance >= 1 AND relevance <= 10),
    notes TEXT,
    file_attachments JSON,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_research_project ON research_notes(project_id);
CREATE INDEX idx_research_category ON research_notes(category);
CREATE INDEX idx_research_relevance ON research_notes(relevance);
CREATE VIRTUAL TABLE research_fts USING fts5(title, content, category, tags, content='research_notes', content_rowid='rowid');
```

### Citations Table
```sql
CREATE TABLE citations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    citation_key TEXT NOT NULL,
    citation_type TEXT CHECK (citation_type IN ('book', 'article', 'website', 'interview', 'document', 'other')),
    title TEXT NOT NULL,
    authors JSON,
    publication_date TEXT,
    publisher TEXT,
    url TEXT,
    isbn TEXT,
    doi TEXT,
    pages TEXT,
    volume TEXT,
    issue TEXT,
    citation_style TEXT DEFAULT 'chicago',
    formatted_citation TEXT,
    notes TEXT,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_citations_project ON citations(project_id);
CREATE INDEX idx_citations_type ON citations(citation_type);
CREATE UNIQUE INDEX idx_citations_key ON citations(project_id, citation_key);
```

## Analytics and Statistics Tables

### Project Statistics Table
```sql
CREATE TABLE project_statistics (
    project_id TEXT PRIMARY KEY,
    total_words INTEGER DEFAULT 0,
    total_characters INTEGER DEFAULT 0,
    total_files INTEGER DEFAULT 0,
    chapters_count INTEGER DEFAULT 0,
    scenes_count INTEGER DEFAULT 0,
    characters_count INTEGER DEFAULT 0,
    locations_count INTEGER DEFAULT 0,
    writing_sessions INTEGER DEFAULT 0,
    total_writing_time INTEGER DEFAULT 0,
    average_session_length INTEGER DEFAULT 0,
    words_per_day_average INTEGER DEFAULT 0,
    productivity_score REAL DEFAULT 0.0,
    last_calculated DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

### Writing Sessions Table
```sql
CREATE TABLE writing_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    file_id TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    words_written INTEGER DEFAULT 0,
    characters_written INTEGER DEFAULT 0,
    session_type TEXT DEFAULT 'writing' CHECK (session_type IN ('writing', 'editing', 'planning', 'research')),
    mood TEXT,
    productivity_rating INTEGER CHECK (productivity_rating >= 1 AND productivity_rating <= 10),
    notes TEXT,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL
);

CREATE INDEX idx_sessions_project ON writing_sessions(project_id);
CREATE INDEX idx_sessions_start_time ON writing_sessions(start_time);
CREATE INDEX idx_sessions_type ON writing_sessions(session_type);
```

### Daily Statistics Table
```sql
CREATE TABLE daily_statistics (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    date TEXT NOT NULL,
    words_written INTEGER DEFAULT 0,
    characters_written INTEGER DEFAULT 0,
    files_modified INTEGER DEFAULT 0,
    writing_time INTEGER DEFAULT 0,
    sessions_count INTEGER DEFAULT 0,
    goal_words INTEGER DEFAULT 0,
    goal_achieved BOOLEAN DEFAULT FALSE,
    notes TEXT,
    metadata JSON,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_daily_stats_project ON daily_statistics(project_id);
CREATE INDEX idx_daily_stats_date ON daily_statistics(date);
CREATE UNIQUE INDEX idx_daily_stats_project_date ON daily_statistics(project_id, date);
```

## User Preferences and Settings Tables

### User Settings Table
```sql
CREATE TABLE user_settings (
    key TEXT PRIMARY KEY,
    value JSON NOT NULL,
    category TEXT,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settings_category ON user_settings(category);
```

### AI Agent Settings Table
```sql
CREATE TABLE agent_settings (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    agent_type TEXT NOT NULL CHECK (agent_type IN ('cascade', 'planning', 'writing', 'editing', 'research')),
    settings JSON NOT NULL,
    is_global BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_agent_settings_project ON agent_settings(project_id);
CREATE INDEX idx_agent_settings_type ON agent_settings(agent_type);
CREATE INDEX idx_agent_settings_global ON agent_settings(is_global);
```

## Collaboration Tables

### Collaborators Table
```sql
CREATE TABLE collaborators (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'reviewer', 'reader')),
    permissions JSON,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    joined_at DATETIME,
    last_active DATETIME,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_collaborators_project ON collaborators(project_id);
CREATE INDEX idx_collaborators_user ON collaborators(user_id);
CREATE INDEX idx_collaborators_status ON collaborators(status);
CREATE UNIQUE INDEX idx_collaborators_project_user ON collaborators(project_id, user_id);
```

### Comments Table
```sql
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    file_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    parent_comment_id TEXT,
    content TEXT NOT NULL,
    position_start INTEGER,
    position_end INTEGER,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'deleted')),
    thread_id TEXT,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_project ON comments(project_id);
CREATE INDEX idx_comments_file ON comments(file_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_comments_thread ON comments(thread_id);
```

## System Tables

### Schema Version Table
```sql
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_version (version, description) VALUES (1, 'Initial schema');
```

### Application Log Table
```sql
CREATE TABLE application_log (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    message TEXT NOT NULL,
    category TEXT,
    context JSON,
    user_id TEXT,
    project_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_log_level ON application_log(level);
CREATE INDEX idx_log_category ON application_log(category);
CREATE INDEX idx_log_created_at ON application_log(created_at);
CREATE INDEX idx_log_project ON application_log(project_id);
```

## Database Views

### Project Overview View
```sql
CREATE VIEW project_overview AS
SELECT 
    p.id,
    p.name,
    p.type,
    p.genre,
    p.status,
    p.target_word_count,
    p.current_word_count,
    p.deadline,
    p.created_at,
    p.updated_at,
    ps.total_files,
    ps.chapters_count,
    ps.scenes_count,
    ps.characters_count,
    ps.locations_count,
    ps.writing_sessions,
    ps.total_writing_time,
    ps.productivity_score,
    CASE 
        WHEN p.target_word_count > 0 
        THEN ROUND((p.current_word_count * 100.0) / p.target_word_count, 2)
        ELSE 0 
    END as completion_percentage
FROM projects p
LEFT JOIN project_statistics ps ON p.id = ps.project_id
WHERE p.status != 'deleted';
```

### Recent Activity View
```sql
CREATE VIEW recent_activity AS
SELECT 
    'file' as activity_type,
    f.project_id,
    f.name as title,
    'File updated: ' || f.name as description,
    f.updated_at as timestamp
FROM files f
WHERE f.updated_at > datetime('now', '-7 days')

UNION ALL

SELECT 
    'session' as activity_type,
    ws.project_id,
    'Writing Session' as title,
    'Wrote ' || ws.words_written || ' words' as description,
    ws.start_time as timestamp
FROM writing_sessions ws
WHERE ws.start_time > datetime('now', '-7 days')

ORDER BY timestamp DESC
LIMIT 50;
```

## Database Triggers

### Update Timestamps Trigger
```sql
CREATE TRIGGER update_projects_timestamp 
    AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_files_timestamp 
    AFTER UPDATE ON files
BEGIN
    UPDATE files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_characters_timestamp 
    AFTER UPDATE ON characters
BEGIN
    UPDATE characters SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

### Project Statistics Update Trigger
```sql
CREATE TRIGGER update_project_word_count
    AFTER UPDATE OF word_count ON files
BEGIN
    UPDATE projects 
    SET current_word_count = (
        SELECT COALESCE(SUM(word_count), 0) 
        FROM files 
        WHERE project_id = NEW.project_id
    )
    WHERE id = NEW.project_id;
END;
```

## Database Maintenance

### Cleanup Procedures
```sql
-- Clean up old file versions (keep last 10 versions per file)
DELETE FROM file_versions 
WHERE id NOT IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
            PARTITION BY file_id 
            ORDER BY version_number DESC
        ) as rn
        FROM file_versions
    ) ranked
    WHERE rn <= 10
);

-- Clean up old log entries (keep last 30 days)
DELETE FROM application_log 
WHERE created_at < datetime('now', '-30 days');

-- Update statistics
UPDATE project_statistics 
SET last_calculated = CURRENT_TIMESTAMP
WHERE project_id IN (
    SELECT DISTINCT project_id 
    FROM files 
    WHERE updated_at > datetime('now', '-1 day')
);
```

This database schema provides a comprehensive foundation for the Author application, supporting all core features while maintaining performance and data integrity.
