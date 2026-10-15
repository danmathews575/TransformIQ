"""Tests for config, error envelope, and middleware."""

import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError, SQLAlchemyError

# Ensure DATABASE_URL is not set for these tests
os.environ.pop("DATABASE_URL", None)
os.environ.pop("CORS_ORIGINS", None)

from app.api import app
from app.config import Settings, get_settings
from app.database import DatabaseUnavailableError, check_database_connection, get_db
from app.errors import AppError


client = TestClient(app)


class TestSettings:
    """Tests for configuration settings."""

    def test_defaults_when_env_empty(self):
        """Settings should have sensible defaults when no env vars are set."""
        # Clear any cached settings
        get_settings.cache_clear()

        with patch.dict(os.environ, {}, clear=True):
            settings = Settings()

        assert settings.database_url is None
        assert settings.cors_origins_list == [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        assert settings.environment == "development"
        assert settings.app_version == "0.3.0"

    def test_cors_origins_parsing(self):
        """CORS_ORIGINS should be parsed from comma-separated string."""
        get_settings.cache_clear()

        with patch.dict(os.environ, {"CORS_ORIGINS": "http://a.com, http://b.com,http://c.com"}):
            settings = Settings()

        assert settings.cors_origins_list == ["http://a.com", "http://b.com", "http://c.com"]

    def test_cors_origins_empty_string(self):
        """Empty CORS_ORIGINS should result in empty list."""
        get_settings.cache_clear()

        with patch.dict(os.environ, {"CORS_ORIGINS": ""}):
            settings = Settings()

        assert settings.cors_origins_list == []

    def test_cors_origins_json_array(self):
        """CORS_ORIGINS should parse JSON array format."""
        get_settings.cache_clear()

        with patch.dict(os.environ, {"CORS_ORIGINS": '["http://a.com", "http://b.com"]'}):
            settings = Settings()

        assert settings.cors_origins_list == ["http://a.com", "http://b.com"]

    def test_database_url_missing_no_exception(self):
        """Missing DATABASE_URL should not raise at import or settings creation."""
        get_settings.cache_clear()

        with patch.dict(os.environ, {}, clear=True):
            settings = Settings()
            assert settings.database_url is None

    def test_get_settings_cached(self):
        """get_settings should return cached instance."""
        get_settings.cache_clear()

        s1 = get_settings()
        s2 = get_settings()

        assert s1 is s2


class TestImportWithoutDatabase:
    """Tests that app imports without DATABASE_URL."""

    def test_import_api_without_db(self):
        """Importing app.api should not raise when DATABASE_URL is unset."""
        # This test passes if the import above succeeded
        assert app is not None

    def test_import_database_module(self):
        """Importing app.database should not raise."""
        from app import database
        assert database is not None


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_root_endpoint(self):
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["name"] == "TransformIQ"
        assert response.json()["status"] == "running"

    def test_health_endpoint(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_health_db_without_db(self):
        """GET /health/db should return 503 envelope when DB is unconfigured."""
        response = client.get("/health/db")
        assert response.status_code == 503
        body = response.json()
        assert body["code"] == "database_unavailable"
        assert "unavailable" in body["message"].lower()
        assert "request_id" in body
        # Ensure no connection details leaked
        body_str = str(body).lower()
        assert "postgres" not in body_str
        assert "supabase" not in body_str
        assert "password" not in body_str


class TestCORS:
    """Tests for CORS headers."""

    def test_preflight_allowed_origin(self):
        """OPTIONS from allowed origin should get CORS headers."""
        response = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"

    def test_preflight_disallowed_origin(self):
        """OPTIONS from disallowed origin should not get CORS headers."""
        response = client.options(
            "/health",
            headers={
                "Origin": "http://evil.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        # The response may be 200 but without the allow-origin header
        assert response.headers.get("access-control-allow-origin") != "http://evil.com"

    def test_cors_expose_headers(self):
        """Response should expose X-Request-ID header."""
        response = client.get("/health", headers={"Origin": "http://localhost:5173"})
        assert "X-Request-ID" in response.headers.get("access-control-expose-headers", "")


class TestErrorEnvelope:
    """Tests for standard error envelope format."""

    @pytest.fixture
    def mock_db(self):
        """Mock database session for testing validation errors and 404s."""
        from app.database import get_db
        db = MagicMock()
        app.dependency_overrides[get_db] = lambda: db
        yield db
        app.dependency_overrides.clear()

    def test_404_returns_envelope(self, mock_db):
        """404 should return error envelope with code, message, details, request_id."""
        # Mock the scalar to return None (not found)
        mock_db.scalar.return_value = None
        
        response = client.get("/api/v1/assessments/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404
        body = response.json()
        assert body["code"] == "not_found"
        assert "message" in body
        assert "details" in body
        assert "request_id" in body
        assert "X-Request-ID" in response.headers

    def test_422_validation_error_envelope(self, mock_db):
        """422 validation error should have field_errors in details."""
        # Missing required field - validation happens before DB dependency
        response = client.post("/api/v1/assessments", json={})
        assert response.status_code == 422
        body = response.json()
        assert body["code"] == "validation_error"
        assert "field_errors" in body["details"]
        field_errors = body["details"]["field_errors"]
        assert isinstance(field_errors, list)
        assert len(field_errors) > 0
        # Each field error should have field, message, type
        for fe in field_errors:
            assert "field" in fe
            assert "message" in fe
            assert "type" in fe

    def test_unhandled_exception_envelope(self):
        """Unhandled exception should return 500 with internal_error code."""
        # Mock DB to avoid 503
        from app.database import get_db
        from starlette.testclient import TestClient
        
        db = MagicMock()
        app.dependency_overrides[get_db] = lambda: db
        
        # Create a test client that doesn't raise server exceptions
        test_client = TestClient(app, raise_server_exceptions=False)
        
        # Create a test route that raises an exception
        @app.get("/test-error")
        def test_error():
            raise RuntimeError("test error")

        try:
            response = test_client.get("/test-error")
            assert response.status_code == 500
            body = response.json()
            assert body["code"] == "internal_error"
            assert "message" in body
            assert "request_id" in body
            # No stack trace in body
            body_str = str(body).lower()
            assert "traceback" not in body_str
            assert "runtimeerror" not in body_str
        finally:
            # Clean up the test route
            app.router.routes = [r for r in app.router.routes if r.path != "/test-error"]
            app.dependency_overrides.clear()


class TestRequestID:
    """Tests for X-Request-ID header handling."""

    @pytest.fixture
    def mock_db(self):
        """Mock database session."""
        from app.database import get_db
        db = MagicMock()
        app.dependency_overrides[get_db] = lambda: db
        yield db
        app.dependency_overrides.clear()

    def test_request_id_echoed_when_supplied(self, mock_db):
        """Custom X-Request-ID should be echoed in response."""
        custom_id = "custom-request-id-123"
        response = client.get("/health", headers={"X-Request-ID": custom_id})
        assert response.headers["X-Request-ID"] == custom_id

    def test_request_id_generated_when_absent(self):
        """X-Request-ID should be generated when not provided."""
        response = client.get("/health")
        assert "X-Request-ID" in response.headers
        # Should be a valid UUID format
        request_id = response.headers["X-Request-ID"]
        # Basic UUID check
        assert len(request_id) == 36
        assert request_id.count("-") == 4

    def test_request_id_in_error_envelope(self, mock_db):
        """Request ID should be included in error responses."""
        mock_db.scalar.return_value = None
        response = client.get(
            "/api/v1/assessments/00000000-0000-0000-0000-000000000000",
            headers={"X-Request-ID": "test-request-id"},
        )
        assert response.status_code == 404
        body = response.json()
        assert body["request_id"] == "test-request-id"


class TestDatabaseUnavailableError:
    """Tests for database unavailable error handling."""

    def test_assessments_endpoint_returns_503_without_db(self):
        """GET /api/v1/assessments should return 503 envelope when DB unavailable."""
        response = client.get("/api/v1/assessments")
        assert response.status_code == 503
        body = response.json()
        assert body["code"] == "database_unavailable"
        assert "request_id" in body
        body_str = str(body).lower()
        assert "postgres" not in body_str
        assert "supabase" not in body_str
        assert "password" not in body_str

    def test_create_assessment_returns_503_without_db(self):
        """POST /api/v1/assessments should return 503 envelope when DB unavailable."""
        payload = {
            "monthly_queries": 10000,
            "minutes_per_query": 8,
            "hourly_labor_cost": 300,
            "automation_rate": 0.3,
            "implementation_cost": 50000,
            "monthly_ai_cost": 10000,
        }
        response = client.post("/api/v1/assessments", json=payload)
        assert response.status_code == 503
        body = response.json()
        assert body["code"] == "database_unavailable"
        body_str = str(body).lower()
        assert "postgres" not in body_str
        assert "supabase" not in body_str
        assert "password" not in body_str


class TestAppError:
    """Tests for AppError base class."""

    def test_app_error_creation(self):
        error = AppError("test_code", "Test message", 400, {"key": "value"})
        assert error.code == "test_code"
        assert error.message == "Test message"
        assert error.status_code == 400
        assert error.details == {"key": "value"}

    def test_app_error_defaults(self):
        error = AppError("test_code", "Test message")
        assert error.status_code == 500
        assert error.details == {}


class TestDatabaseModule:
    """Tests for database module lazy initialization."""

    def test_database_unavailable_error_raised(self):
        """get_db should raise DatabaseUnavailableError when DB not configured."""
        gen = get_db()
        with pytest.raises(DatabaseUnavailableError):
            next(gen)

    def test_check_database_connection_false_without_db(self):
        """check_database_connection should return False when DB not configured."""
        assert check_database_connection() is False