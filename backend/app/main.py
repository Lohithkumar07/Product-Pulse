import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.database.session import engine, Base
from backend.app.api.endpoints import router as api_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ProductPulse API",
    description="Feedback intelligence platform for websites and software applications.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {
        "app": "ProductPulse",
        "tagline": "Turn feedback into product decisions.",
        "docs": "/docs",
        "api_prefix": "/api"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
