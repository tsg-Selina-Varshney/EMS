from pymongo import MongoClient
from dotenv import load_dotenv
import os
import redis.asyncio as redis

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client.EMS_Data
users_collection = db["Users"]
audit_collection = db["AuditLogs"]

REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = os.getenv("REDIS_PORT")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")

if not REDIS_HOST or "redis.cache.windows.net" not in REDIS_HOST:
    raise ValueError("Invalid Redis hostname. Check your .env file.")

# Create Redis connection with SSL
redis_client = redis.Redis.from_url(
    f"rediss://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}",
    decode_responses=True
)

