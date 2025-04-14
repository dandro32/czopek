from pydantic import BaseModel
from typing import Optional, Any

class ErrorResponse(BaseModel):
    detail: str
    error_code: str
    status_code: int
    data: Optional[Any] = None

class SuccessResponse(BaseModel):
    message: str
    data: Optional[Any] = None 