from decimal import Decimal
import hashlib
import json
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..models import Expense, IdempotencyKey, User
from ..schemas import ExpenseCreate, ExpenseListResponse, ExpenseOut

router = APIRouter(prefix="/expenses", tags=["expenses"])


def _hash_request(payload: ExpenseCreate) -> str:
    serialized = json.dumps(payload.model_dump(mode="json"), sort_keys=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    if not idempotency_key:
        raise HTTPException(
            status_code=400,
            detail="Idempotency-Key header is required for safe retries",
        )

    request_hash = _hash_request(payload)
    existing_key = (
        db.query(IdempotencyKey)
        .filter(IdempotencyKey.user_id == current_user.id, IdempotencyKey.key == idempotency_key)
        .first()
    )

    if existing_key:
        if existing_key.request_hash != request_hash:
            raise HTTPException(
                status_code=409,
                detail="Idempotency key already used for a different request",
            )
        return ExpenseOut.model_validate(json.loads(existing_key.response_body))

    expense = Expense(
        user_id=current_user.id,
        amount=payload.amount,
        category=payload.category.strip(),
        description=payload.description.strip(),
        date=payload.date,
    )
    db.add(expense)
    db.flush()

    response_payload = ExpenseOut.model_validate(expense).model_dump(mode="json")

    record = IdempotencyKey(
        user_id=current_user.id,
        key=idempotency_key,
        request_hash=request_hash,
        response_body=json.dumps(response_payload),
        status_code=201,
    )
    db.add(record)
    db.commit()
    db.refresh(expense)

    return expense


@router.get("", response_model=ExpenseListResponse)
def list_expenses(
    category: str | None = Query(default=None),
    sort: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Expense).filter(Expense.user_id == current_user.id)

    if category:
        query = query.filter(func.lower(Expense.category) == category.strip().lower())

    if sort == "date_desc":
        query = query.order_by(Expense.date.desc(), Expense.created_at.desc())
    else:
        query = query.order_by(Expense.created_at.desc())

    expenses = query.all()
    total = sum((expense.amount for expense in expenses), Decimal("0.00"))

    return ExpenseListResponse(expenses=expenses, total=total)
