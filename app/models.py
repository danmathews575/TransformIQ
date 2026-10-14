"""SQLAlchemy models for assessment history."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Assessment(Base):
    """A saved business assessment and its ROI results."""

    __tablename__ = "assessments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    input_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    roi_results: Mapped[dict] = mapped_column(JSONB, nullable=False)
    scoring_engine_version: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="0.2.0",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    rankings: Mapped[list["OpportunityRanking"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
        order_by="OpportunityRanking.rank",
    )


class OpportunityRanking(Base):
    """A ranked opportunity belonging to an assessment."""

    __tablename__ = "opportunity_rankings"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    opportunity_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    details: Mapped[dict] = mapped_column(JSONB, nullable=False)

    assessment: Mapped["Assessment"] = relationship(
        back_populates="rankings",
    )
