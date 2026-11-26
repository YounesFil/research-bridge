-- ResearchBridge schema (MySQL 8).
-- Load against the research_bridge database, e.g.:
--     mysql -u rb_app -p research_bridge < db/schema.sql

SET NAMES utf8mb4;

-- Dropped in dependency order so the script is re-runnable in development.
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS collection_papers;
DROP TABLE IF EXISTS collections;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS citations;
DROP TABLE IF EXISTS paper_topics;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS paper_authors;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS papers;

-- =====================================================================
-- Core bibliographic entities (imported from OpenAlex)
-- =====================================================================

-- A scholarly work. paper_id is the OpenAlex short id (e.g. 'W2101786389').
-- is_stub marks a paper that is referenced by an imported paper but has not
-- itself been fully imported yet; it keeps citation foreign keys valid and is
-- backfilled on a later import pass.
CREATE TABLE papers (
    paper_id          VARCHAR(20)   NOT NULL,
    title             TEXT          NULL,
    doi               VARCHAR(255)  NULL,
    publication_year  SMALLINT      NULL,
    abstract          MEDIUMTEXT    NULL,
    cited_by_count    INT           NOT NULL DEFAULT 0,
    is_stub           BOOLEAN       NOT NULL DEFAULT FALSE,
    ingested_at       TIMESTAMP     NULL,
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (paper_id),
    KEY idx_papers_doi (doi),
    KEY idx_papers_year (publication_year),
    KEY idx_papers_cited (cited_by_count),
    KEY idx_papers_stub (is_stub),
    FULLTEXT KEY ft_papers_title_abstract (title, abstract)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- An author. author_id is the OpenAlex short id (e.g. 'A5008...').
CREATE TABLE authors (
    author_id   VARCHAR(20)   NOT NULL,
    name        VARCHAR(500)  NOT NULL,
    orcid       VARCHAR(50)   NULL,
    PRIMARY KEY (author_id),
    KEY idx_authors_name (name(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Authorship: which authors wrote which papers, and in what order.
CREATE TABLE paper_authors (
    paper_id         VARCHAR(20)  NOT NULL,
    author_id        VARCHAR(20)  NOT NULL,
    author_position  SMALLINT     NULL,
    PRIMARY KEY (paper_id, author_id),
    KEY idx_pa_author (author_id),
    CONSTRAINT fk_pa_paper  FOREIGN KEY (paper_id)  REFERENCES papers(paper_id)   ON DELETE CASCADE,
    CONSTRAINT fk_pa_author FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A research topic from the OpenAlex taxonomy, with its subfield/field/domain.
CREATE TABLE topics (
    topic_id       VARCHAR(20)   NOT NULL,
    name           VARCHAR(300)  NOT NULL,
    subfield_name  VARCHAR(200)  NULL,
    field_name     VARCHAR(200)  NULL,
    domain_name    VARCHAR(200)  NULL,
    PRIMARY KEY (topic_id),
    KEY idx_topics_field (field_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Topic assignments for a paper, with OpenAlex's relevance score (0..1).
CREATE TABLE paper_topics (
    paper_id   VARCHAR(20)   NOT NULL,
    topic_id   VARCHAR(20)   NOT NULL,
    score      DECIMAL(6,5)  NULL,
    PRIMARY KEY (paper_id, topic_id),
    KEY idx_pt_topic (topic_id),
    CONSTRAINT fk_pt_paper FOREIGN KEY (paper_id) REFERENCES papers(paper_id) ON DELETE CASCADE,
    CONSTRAINT fk_pt_topic FOREIGN KEY (topic_id) REFERENCES topics(topic_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A directed citation: citing_paper_id references cited_paper_id.
-- The two foreign keys to papers are the "citing" and "cited" roles.
-- The primary key indexes forward traversal (references of a paper); the
-- secondary index covers reverse traversal (papers that cite a paper).
CREATE TABLE citations (
    citing_paper_id  VARCHAR(20)  NOT NULL,
    cited_paper_id   VARCHAR(20)  NOT NULL,
    PRIMARY KEY (citing_paper_id, cited_paper_id),
    KEY idx_cit_cited (cited_paper_id),
    CONSTRAINT fk_cit_citing FOREIGN KEY (citing_paper_id) REFERENCES papers(paper_id) ON DELETE CASCADE,
    CONSTRAINT fk_cit_cited  FOREIGN KEY (cited_paper_id)  REFERENCES papers(paper_id) ON DELETE CASCADE,
    CONSTRAINT chk_cit_no_self CHECK (citing_paper_id <> cited_paper_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Application data (user-created; the CRUD surface)
-- =====================================================================

CREATE TABLE users (
    user_id     INT           NOT NULL AUTO_INCREMENT,
    username    VARCHAR(100)  NOT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE collections (
    collection_id  INT           NOT NULL AUTO_INCREMENT,
    user_id        INT           NOT NULL,
    name           VARCHAR(200)  NOT NULL,
    description    TEXT          NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id),
    KEY idx_coll_user (user_id),
    CONSTRAINT fk_coll_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE collection_papers (
    collection_id  INT          NOT NULL,
    paper_id       VARCHAR(20)  NOT NULL,
    added_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, paper_id),
    KEY idx_cp_paper (paper_id),
    CONSTRAINT fk_cp_coll  FOREIGN KEY (collection_id) REFERENCES collections(collection_id) ON DELETE CASCADE,
    CONSTRAINT fk_cp_paper FOREIGN KEY (paper_id)      REFERENCES papers(paper_id)           ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notes (
    note_id     INT           NOT NULL AUTO_INCREMENT,
    user_id     INT           NOT NULL,
    paper_id    VARCHAR(20)   NOT NULL,
    content     TEXT          NOT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (note_id),
    KEY idx_notes_user (user_id),
    KEY idx_notes_paper (paper_id),
    CONSTRAINT fk_notes_user  FOREIGN KEY (user_id)  REFERENCES users(user_id)   ON DELETE CASCADE,
    CONSTRAINT fk_notes_paper FOREIGN KEY (paper_id) REFERENCES papers(paper_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
