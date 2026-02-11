import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"


class UploadSource(str, enum.Enum):
    WEB = "web"
    WATCH_FOLDER = "watch_folder"


class VersionStatus(str, enum.Enum):
    QUEUED = "queued"
    EXTRACTING = "extracting"
    EXTRACTED = "extracted"
    OCR_RUNNING = "ocr_running"
    OCR_DONE = "ocr_done"
    CHUNKING = "chunking"
    CHUNKED = "chunked"
    EMBEDDING = "embedding"
    EMBEDDED = "embedded"
    READY = "ready"
    ERROR = "error"


class JobStage(str, enum.Enum):
    EXTRACT = "extract"
    OCR = "ocr"
    CHUNK = "chunk"
    EMBED = "embed"
    FINALIZE = "finalize"


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"
