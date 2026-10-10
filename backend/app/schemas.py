from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class RegisterIn(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=10, max_length=128)

class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str
    created_at: datetime

class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=140)
    description: str = Field(default="", max_length=4000)

class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str
    status: str
    created_at: datetime

class WorkItemCreate(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    description: str = Field(default="", max_length=4000)

class WorkItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    status: str
    is_done: bool
    project_id: int
    created_at: datetime
