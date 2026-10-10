from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .config import CORS_ORIGINS
from .database import Base, engine, get_db
from .models import User, Project, WorkItem
from .schemas import RegisterIn, LoginIn, TokenOut, UserOut, ProjectCreate, ProjectOut, WorkItemCreate, WorkItemOut
from .security import hash_password, verify_password, create_access_token
from .dependencies import get_current_user

@asynccontextmanager
async def lifespan(app: FastAPI):
    # For this starter only. Use Alembic migrations for controlled production schema changes.
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="Northstar Business API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True, allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "northstar-api"}

@app.post("/api/v1/auth/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    email = str(payload.email).strip().lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = User(email=email, full_name=payload.full_name.strip(), password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_access_token(user.id))

@app.post("/api/v1/auth/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    email = str(payload.email).strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password", headers={"WWW-Authenticate": "Bearer"})
    return TokenOut(access_token=create_access_token(user.id))

@app.get("/api/v1/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user

@app.get("/api/v1/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    projects_count = db.scalar(select(func.count(Project.id)).where(Project.owner_id == user.id)) or 0
    items_count = db.scalar(select(func.count(WorkItem.id)).join(Project).where(Project.owner_id == user.id)) or 0
    done_count = db.scalar(select(func.count(WorkItem.id)).join(Project).where(Project.owner_id == user.id, WorkItem.is_done.is_(True))) or 0
    return {"projects": projects_count, "work_items": items_count, "completed_items": done_count}

@app.get("/api/v1/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return list(db.scalars(select(Project).where(Project.owner_id == user.id).order_by(Project.created_at.desc())).all())

@app.post("/api/v1/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = Project(name=payload.name.strip(), description=payload.description.strip(), owner_id=user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@app.get("/api/v1/projects/{project_id}/work-items", response_model=list[WorkItemOut])
def list_work_items(project_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.scalar(select(Project).where(Project.id == project_id, Project.owner_id == user.id))
    if project is None: raise HTTPException(status_code=404, detail="Project not found")
    return list(db.scalars(select(WorkItem).where(WorkItem.project_id == project.id).order_by(WorkItem.created_at.desc())).all())

@app.post("/api/v1/projects/{project_id}/work-items", response_model=WorkItemOut, status_code=status.HTTP_201_CREATED)
def create_work_item(project_id: int, payload: WorkItemCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.scalar(select(Project).where(Project.id == project_id, Project.owner_id == user.id))
    if project is None: raise HTTPException(status_code=404, detail="Project not found")
    item = WorkItem(title=payload.title.strip(), description=payload.description.strip(), project_id=project.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.patch("/api/v1/work-items/{item_id}/complete", response_model=WorkItemOut)
def complete_work_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.scalar(select(WorkItem).join(Project).where(WorkItem.id == item_id, Project.owner_id == user.id))
    if item is None: raise HTTPException(status_code=404, detail="Work item not found")
    item.is_done = not item.is_done
    item.status = "done" if item.is_done else "todo"
    db.commit()
    db.refresh(item)
    return item
