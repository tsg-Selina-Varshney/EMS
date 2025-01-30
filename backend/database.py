from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client.EMS_Data
users_collection = db["Users"]
audit_collection = db["AuditLogs"]

