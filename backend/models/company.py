from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime


class CompanyBase(BaseModel):
    name: str = Field(..., description="Legal company name")
    tax_id: str = Field(..., description="Tax Identification Number (EIN / VAT)")
    reconciliation_email: EmailStr = Field(..., description="Accounting officer email for reconciliation notices")
    contact_name: str = Field(..., description="Name of the reconciliation contact person")
    status: Literal["active", "inactive"] = Field(default="active", description="Counterparty status")
    is_own_company: bool = Field(default=False, description="True if this is our own company in the system")

    model_config = {"populate_by_name": True}


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    reconciliation_email: Optional[EmailStr] = None
    contact_name: Optional[str] = None
    status: Optional[Literal["active", "inactive"]] = None
    is_own_company: Optional[bool] = None


class CompanyResponse(CompanyBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}
