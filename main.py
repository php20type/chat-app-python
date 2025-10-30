import os
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

import db, models
from routes import router as api_router

app = FastAPI(title="Character Chat API")

# CORS — now only needed if you use an external frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # loosened for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Mount frontend ---
BASE_DIR = os.path.dirname(__file__)  # This points to the current directory
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

@app.get("/", response_class=HTMLResponse)
def serve_index(request: Request):
    """Serve the frontend."""
    return templates.TemplateResponse("index.html", {"request": request})

# --- API ---
app.include_router(api_router, prefix="/api")

# --- Create tables on startup ---
@app.on_event("startup")
def startup():
    models.Base.metadata.create_all(bind=db.engine)
