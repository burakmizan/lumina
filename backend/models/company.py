from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class CompanyBase(BaseModel):
    name: str = Field(..., description="Legal company name")
    tax_id: str = Field(..., description="Tax identification number (Vergi Kimlik No)")
    reconciliation_email: EmailStr = Field(..., description="Accounting officer email for reconciliation notices")
    contact_name: str = Field(..., description="Name of the reconciliation contact person")

    model_config = {"populate_by_name": True}


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    reconciliation_email: Optional[EmailStr] = None
    contact_name: Optional[str] = None


class CompanyResponse(CompanyBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}
