from fastapi import Request
from fastapi.responses import JSONResponse
from app.shared.models import ErrorResponse
import logging
import traceback
from typing import Callable
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def error_logging_middleware(request: Request, call_next: Callable):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        stack_trace = traceback.format_exception(exc_type, exc_value, exc_traceback)
        
        logger.error(f"Błąd podczas przetwarzania żądania: {request.url}")
        logger.error("Stack trace:")
        for line in stack_trace:
            logger.error(line.strip())
        
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                detail="Wystąpił nieoczekiwany błąd",
                error_code="INTERNAL_SERVER_ERROR",
                status_code=500,
                data={
                    "error": str(e),
                    "path": str(request.url),
                    "method": request.method
                }
            ).dict()
        ) 