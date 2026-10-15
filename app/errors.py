"""Standard error envelope and exception handlers."""

import logging
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database import DatabaseUnavailableError

logger = logging.getLogger(__name__)


class ErrorDetail(BaseModel):
    """Field-level validation error detail."""

    field: str
    message: str
    type: str


class ErrorResponse(BaseModel):
    """Standard error response envelope."""

    code: str
    message: str
    details: Dict[str, Any] = {}
    request_id: str


class AppError(Exception):
    """Base application error with structured details.

    Args:
        code: Machine-readable error code.
        message: Human-readable error message.
        status_code: HTTP status code to return.
        details: Additional structured details for the response.
    """

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


def _build_error_response(
    request: Request,
    code: str,
    message: str,
    status_code: int,
    details: Optional[Dict[str, Any]] = None,
) -> JSONResponse:
    """Build a standardized error response with request ID."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    response = ErrorResponse(
        code=code,
        message=message,
        details=details or {},
        request_id=request_id,
    )
    return JSONResponse(
        status_code=status_code,
        content=response.model_dump(),
        headers={"X-Request-ID": request_id},
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Handle FastAPI/Starlette HTTP exceptions."""
    # Preserve existing status codes for known cases
    if exc.status_code == 404:
        return _build_error_response(
            request,
            code="not_found",
            message=exc.detail if isinstance(exc.detail, str) else "Resource not found",
            status_code=404,
        )
    if exc.status_code == 422:
        # Domain ValueError raised as HTTPException with 422
        return _build_error_response(
            request,
            code="validation_error",
            message=exc.detail if isinstance(exc.detail, str) else "Validation failed",
            status_code=422,
        )

    # Check for custom error code in headers
    error_code = exc.headers.get("X-Error-Code") if exc.headers else None
    if error_code:
        return _build_error_response(
            request,
            code=error_code,
            message=exc.detail if isinstance(exc.detail, str) else "Error",
            status_code=exc.status_code,
        )

    return _build_error_response(
        request,
        code="http_error",
        message=exc.detail if isinstance(exc.detail, str) else "HTTP error",
        status_code=exc.status_code,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic request validation errors with field-level details."""
    field_errors: List[ErrorDetail] = []
    for error in exc.errors():
        field_path = ".".join(str(loc) for loc in error["loc"][1:])  # Skip 'body'
        field_errors.append(
            ErrorDetail(
                field=field_path or "body",
                message=error["msg"],
                type=error["type"],
            )
        )

    return _build_error_response(
        request,
        code="validation_error",
        message="Request validation failed",
        status_code=422,
        details={"field_errors": [e.model_dump() for e in field_errors]},
    )


async def database_unavailable_handler(
    request: Request, exc: DatabaseUnavailableError
) -> JSONResponse:
    """Handle database unavailable errors (503)."""
    return _build_error_response(
        request,
        code="database_unavailable",
        message="Database is currently unavailable. Please try again later.",
        status_code=503,
    )


async def sqlalchemy_operational_error_handler(
    request: Request, exc: OperationalError
) -> JSONResponse:
    """Handle SQLAlchemy operational errors (503)."""
    logger.warning("Database operational error: %s", exc)
    return _build_error_response(
        request,
        code="database_unavailable",
        message="Database is currently unavailable. Please try again later.",
        status_code=503,
    )


async def sqlalchemy_error_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    """Handle other SQLAlchemy errors (500)."""
    logger.error("Database error: %s", exc)
    return _build_error_response(
        request,
        code="database_error",
        message="A database error occurred. Please try again.",
        status_code=500,
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Catch-all handler for unhandled exceptions (500)."""
    logger.exception("Unhandled exception: %s", exc)
    return _build_error_response(
        request,
        code="internal_error",
        message="An internal server error occurred.",
        status_code=500,
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app."""
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(DatabaseUnavailableError, database_unavailable_handler)
    app.add_exception_handler(OperationalError, sqlalchemy_operational_error_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)