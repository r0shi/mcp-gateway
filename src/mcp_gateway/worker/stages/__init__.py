"""Ingestion stage registry — maps JobStage to callable."""

from mcp_gateway.models.enums import JobStage
from mcp_gateway.worker.stages.chunk import run_chunk
from mcp_gateway.worker.stages.embed import run_embed
from mcp_gateway.worker.stages.extract import run_extract
from mcp_gateway.worker.stages.finalize import run_finalize
from mcp_gateway.worker.stages.ocr import run_ocr

STAGE_FUNCTIONS = {
    JobStage.extract: run_extract,
    JobStage.ocr: run_ocr,
    JobStage.chunk: run_chunk,
    JobStage.embed: run_embed,
    JobStage.finalize: run_finalize,
}
