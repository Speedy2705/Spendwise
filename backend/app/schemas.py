from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, EmailStr, Field, ConfigDict, condecimal


class UserSignup(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ExpenseCreate(BaseModel):
    amount: condecimal(gt=Decimal("0"), max_digits=12, decimal_places=2)
    category: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=1, max_length=500)
    date: date


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: Decimal
    category: str
    description: str
    date: date
    created_at: datetime


class ExpenseListResponse(BaseModel):
    expenses: list[ExpenseOut]
    total: Decimal
