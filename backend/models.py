from datetime import date, datetime
from pydantic import BaseModel

class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str
    name: str
    
    
class DataModel(BaseModel):
    username: str
    name: str
    password: str
    department: str
    designation: str
    email: str
    phone: int
    sdate: str
    role: str

class AuditModel(BaseModel):
    timestamp: datetime
    username: str
    userchanged: str
    action: str