-- Azure Builder Hub — Initial schema (Azure SQL)
-- 5 tables: projects, versions, stars, shares, collections + collection_projects junction

CREATE TABLE projects (
    id              UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    name            NVARCHAR(200)     NOT NULL,
    description     NVARCHAR(MAX)     NOT NULL DEFAULT '',
    author_id       NVARCHAR(200)     NOT NULL,
    author_name     NVARCHAR(200)     NOT NULL DEFAULT '',
    status          NVARCHAR(20)      NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'published', 'archived')),
    tags            NVARCHAR(MAX)     NOT NULL DEFAULT '[]',   -- JSON array
    azure_services  NVARCHAR(MAX)     NOT NULL DEFAULT '[]',   -- JSON array
    layout          NVARCHAR(20)      NOT NULL DEFAULT 'full-width'
                        CHECK (layout IN ('full-width', 'side-panel')),
    page_count      INT               NOT NULL DEFAULT 0,
    current_version INT               NOT NULL DEFAULT 0,
    star_count      INT               NOT NULL DEFAULT 0,
    fork_count      INT               NOT NULL DEFAULT 0,
    forked_from_project_id   UNIQUEIDENTIFIER  NULL,
    forked_from_project_name NVARCHAR(200)     NULL,
    forked_from_author_name  NVARCHAR(200)     NULL,
    thumbnail_url   NVARCHAR(2000)    NOT NULL DEFAULT '',
    preview_url     NVARCHAR(2000)    NOT NULL DEFAULT '',
    created_at      DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at      DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    published_at    DATETIME2         NULL,
    deleted_at      DATETIME2         NULL
);

CREATE INDEX IX_projects_author   ON projects (author_id) WHERE deleted_at IS NULL;
CREATE INDEX IX_projects_status   ON projects (status)    WHERE deleted_at IS NULL;
CREATE INDEX IX_projects_stars    ON projects (star_count DESC) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX IX_projects_forks    ON projects (fork_count DESC) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX IX_projects_published ON projects (published_at DESC) WHERE status = 'published' AND deleted_at IS NULL;

-- Full-text search not needed at <10K rows — LIKE '%term%' is fine.
-- Add full-text catalog later if needed:
-- CREATE FULLTEXT CATALOG ftCatalog AS DEFAULT;
-- CREATE FULLTEXT INDEX ON projects (name, description) KEY INDEX <pk_name>;

CREATE TABLE versions (
    id              UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    project_id      UNIQUEIDENTIFIER  NOT NULL REFERENCES projects(id),
    version         INT               NOT NULL,
    bundle_url      NVARCHAR(2000)    NOT NULL DEFAULT '',
    manifest        NVARCHAR(MAX)     NOT NULL DEFAULT '{}',   -- JSON
    changelog       NVARCHAR(MAX)     NULL,
    created_at      DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_versions_project ON versions (project_id, version DESC);

CREATE TABLE stars (
    user_id         NVARCHAR(200)     NOT NULL,
    project_id      UNIQUEIDENTIFIER  NOT NULL REFERENCES projects(id),
    created_at      DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (user_id, project_id)
);

CREATE INDEX IX_stars_project ON stars (project_id);

CREATE TABLE shares (
    id              UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    project_id      UNIQUEIDENTIFIER  NOT NULL REFERENCES projects(id),
    owner_id        NVARCHAR(200)     NOT NULL,
    owner_name      NVARCHAR(200)     NOT NULL DEFAULT '',
    shared_with_id  NVARCHAR(200)     NOT NULL,
    shared_with_name NVARCHAR(200)    NOT NULL DEFAULT '',
    created_at      DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UNIQUE (project_id, shared_with_id)
);

CREATE INDEX IX_shares_owner    ON shares (owner_id);
CREATE INDEX IX_shares_shared   ON shares (shared_with_id);

CREATE TABLE collections (
    id              UNIQUEIDENTIFIER  PRIMARY KEY DEFAULT NEWID(),
    name            NVARCHAR(200)     NOT NULL,
    description     NVARCHAR(MAX)     NOT NULL DEFAULT '',
    author_id       NVARCHAR(200)     NOT NULL,
    author_name     NVARCHAR(200)     NOT NULL DEFAULT '',
    created_at      DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at      DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at      DATETIME2         NULL
);

CREATE INDEX IX_collections_author ON collections (author_id) WHERE deleted_at IS NULL;

CREATE TABLE collection_projects (
    collection_id   UNIQUEIDENTIFIER  NOT NULL REFERENCES collections(id),
    project_id      UNIQUEIDENTIFIER  NOT NULL REFERENCES projects(id),
    added_at        DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (collection_id, project_id)
);
