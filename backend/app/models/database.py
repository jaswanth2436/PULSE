"""SQLAlchemy database models for PULSE."""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    mode = Column(String(50), default="simulation")

    intent_profiles = relationship("IntentProfile", back_populates="session")


class Intersection(Base):
    __tablename__ = "intersections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    config_json = Column(Text, default="{}")


class IntentProfile(Base):
    __tablename__ = "intent_profiles"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    priorities_json = Column(Text, default="{}")
    weights_json = Column(Text, default="{}")
    constraints_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="intent_profiles")


class TrafficObservation(Base):
    __tablename__ = "traffic_observations"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    approach = Column(String(10), nullable=False)
    vehicle_count = Column(Integer, default=0)
    queue_count = Column(Integer, default=0)
    avg_wait = Column(Float, default=0.0)
    max_wait = Column(Float, default=0.0)
    signal_state = Column(String(20), default="RED")


class ExperimentRun(Base):
    __tablename__ = "experiment_runs"

    id = Column(Integer, primary_key=True, index=True)
    scenario = Column(String(50), nullable=False)
    controller_type = Column(String(50), nullable=False)
    duration = Column(Integer, default=3600)
    seed = Column(Integer, default=42)
    config_json = Column(Text, default="{}")
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    metrics = relationship("ExperimentMetric", back_populates="experiment")
    signal_plans = relationship("SignalPlan", back_populates="experiment")
    reports = relationship("Report", back_populates="experiment")


class ExperimentMetric(Base):
    __tablename__ = "experiment_metrics"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiment_runs.id"), nullable=False)
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Float, nullable=False)
    approach = Column(String(10), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    experiment = relationship("ExperimentRun", back_populates="metrics")


class SignalPlan(Base):
    __tablename__ = "signal_plans"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiment_runs.id"), nullable=True)
    phase_durations_json = Column(Text, default="{}")
    safety_valid = Column(Boolean, default=True)
    violations_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

    experiment = relationship("ExperimentRun", back_populates="signal_plans")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    level = Column(String(20), default="info")
    message = Column(Text, nullable=False)
    category = Column(String(50), default="system")
    dismissed = Column(Boolean, default=False)


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiment_runs.id"), nullable=True)
    config_json = Column(Text, default="{}")
    results_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)

    experiment = relationship("ExperimentRun", back_populates="reports")
