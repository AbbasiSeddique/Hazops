"""
HAZOP Assistant Agent Backend - FastAPI Application Entry Point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from api.upload import router as upload_router
from api.study import router as study_router
from api.deviations import router as deviations_router
from api.agent_routes import router as agent_router
from api.reports import router as reports_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    print("HAZOP Assistant Agent Backend started")
    yield
    print("HAZOP Assistant Agent Backend shutting down")


app = FastAPI(
    title="HAZOP Assistant Agent",
    description="AI-powered HAZOP study assistant using Google ADK and Gemini",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload_router)
app.include_router(study_router)
app.include_router(deviations_router)
app.include_router(agent_router)
app.include_router(reports_router)

# WebSocket endpoint (must be added directly to app)
# WebSocket removed — using REST chat endpoint instead


@app.get("/health", tags=["health"])
async def health_check() -> dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "hazop-assistant-agent",
        "version": "0.1.0",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
