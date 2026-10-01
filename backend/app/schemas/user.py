import uuid
from datetime import datetime
from typing import Annotated

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    model_validator,
)

from app.models import Role


def check_password(value: str) -> str:
    if len(value) < 8 or not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
        raise ValueError("Password must be at least 8 characters and include a letter and a number")
    return value


Password = Annotated[str, Field(max_length=128), AfterValidator(check_password)]
Email = Annotated[EmailStr, AfterValidator(str.lower)]
FullName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class UserRegister(BaseModel):
    # No role field on purpose: registration always creates a csm.
    email: Email
    password: Password
    full_name: FullName


class UserLogin(BaseModel):
    email: Annotated[str, AfterValidator(lambda v: v.strip().lower())]
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    role: Role
    is_active: bool
    created_at: datetime


class UserOption(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    role: Role


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MeUpdate(BaseModel):
    full_name: FullName | None = None
    current_password: str | None = None
    new_password: Password | None = None

    @model_validator(mode="after")
    def current_password_required(self) -> "MeUpdate":
        if self.new_password and not self.current_password:
            raise ValueError("Enter your current password to set a new one")
        return self


class UserAdminUpdate(BaseModel):
    full_name: FullName | None = None
    role: Role | None = None
    is_active: bool | None = None
