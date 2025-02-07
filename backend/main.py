from datetime import date, datetime
import json
import os
from typing import List
from fastapi import FastAPI, Depends, HTTPException, Header, Query, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import validator
import uvicorn
from auth import hash_password, verify_password, create_access_token, decode_access_token
from database import users_collection, audit_collection, redis_client, departments_collection, designations_collection
from models import AuditModel,Token,DataModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

#CORS SETTING
# To allow cors middleware to connect with frontend, without this cors error
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],  
)

#trial
@app.get("/")
def read_root():
    return "hello world"

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))  # Azure assigns a port dynamically
    uvicorn.run(app, host="0.0.0.0", port=port)

#API FOR LOGIN
@app.post("/token", response_model=Token)
# OAuthPasswordRequestForm is a dependency that automatically extracts username and password from the request. 
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Finds the user in the database by username
    user = users_collection.find_one({"username": form_data.username})
    print("Fetched user:", user)  

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # Plain password which the user inputs
    print("Plain password:", form_data.password)  
    # Hashed password stored in the database
    print("Stored hashed password:", user["password"])  

    # Call verify_password in auth.py
    if not verify_password(form_data.password, user["password"]):
        print("Password verification failed")  
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # If password matches, generate the token
    token_data = {"username": user["username"], "role": user["role"], "name": user["name"]}
    access_token = create_access_token(data=token_data)
    
    print(token_data)

    payload = decode_access_token(access_token)
    print(payload)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    return {"access_token": access_token, "token_type": "bearer", "username": payload["username"], "role": payload["role"], "name":payload["name"]}

 

#API TO GET TABLE DATA WITHOUT SORTING
@app.get("/tabledata")
async def tableData():
    
    cache_key = "all_items"
    cache_exists = await redis_client.exists(cache_key)
    
    # Cache Hit
    if cache_exists:
        print("Source: Redis")
        
        # Fetch all users from Redis Hash
        cached_items = await redis_client.hgetall(cache_key)
        
        # Convert from Redis byte format to a proper dictionary
        formatted_items = {k: json.loads(v) for k, v in cached_items.items()}

        # Return users as a list
        return list(formatted_items.values())  

    # Cache Miss
    tdata = list(users_collection.find({}, {"_id": 0}))  # Exclude _id

    # Store each user in Redis Hash
    for user in tdata:
        username = user.get("username")
        if username:
            await redis_client.hset(cache_key, username, json.dumps(user)) 

    return tdata 


#API TO GET AUDIT TABLE DATA
@app.get("/audittabledata")
async def audittableData():
    
    tdata = list(audit_collection.find({}, {"_id": 0}))  # Exclude `_id`

    # Convert timestamp to ISO format before storing
    for t in tdata:
        if "timestamp" in t and isinstance(t["timestamp"], datetime):
            t["timestamp"] = t["timestamp"].isoformat()

    print("Source: DB always")
    return tdata



#APIS FOR FILTERING:

#COMMMON FUNCTION
def check_column(column):
    if column not in ["department", "designation"]:
        raise HTTPException(status_code=400, detail="Invalid column name")
    

@app.get("/unique/{column}")
async def optionValues(column: str):
    
    check_column(column)

    if(column == "department"):
        collection = departments_collection
    else:
        collection = designations_collection
  
    unique_values = collection.distinct(column) 

    return {"column": column, "unique_values": unique_values}


#API TO GET DATA AS PER COLUMN AND OPTION SELECTED
@app.get("/filter/{column}/{value}", response_model= List[DataModel])
async def filter_data(column: str, value: str):
    
    check_column(column)

    data = list(users_collection.find({column: value}, {"_id": 0}))

    return data

#API TO SORT TABLEDATA
@app.get("/sort",response_model= List[DataModel])
async def sort_data(column: str, desc: bool = False):
    cache_key = "all_items"

    # Fetch all data from Redis Hash
    cached_items = await redis_client.hgetall(cache_key)

    if not cached_items:
        print("No data found in Redis cache.")
        return []

    # Convert Redis Hash response from bytes/strings to dictionaries
    data_list = [json.loads(user_data) for user_data in cached_items.values()]

    # Sort the data based on the given column
    sorted_data = sorted(data_list, key=lambda x: x.get(column, ""), reverse=desc)

    return sorted_data

#FOR COMMON DATETIME CONVERSION
def convert_to_datetime(value):
    
    if isinstance(value, str):
        try:
            # Validate and return as a string
            return datetime.strptime(value, "%Y-%m-%d").strftime("%Y-%m-%d")
        except ValueError:
            raise ValueError("Invalid date format. Expected 'YYYY-MM-DD'.")
    
    elif isinstance(value, date):
        # Convert date object to string
        return value.strftime("%Y-%m-%d")

    elif isinstance(value, datetime):
        # Convert datetime object to string
        return value.strftime("%Y-%m-%d")

    else:
        raise TypeError("Unsupported type for date conversion. Must be str, date, or datetime.")



#UPDATE CACHE
async def update_user_in_hash_cache(cache_key: str, row_id: str, update_dict: dict):

    existing_data = await redis_client.hget(cache_key, row_id)

    if not existing_data:
        print(f"User {row_id} not found in {cache_key}")
        return

    # Convert JSON string to a dictionary
    user_data = json.loads(existing_data)

    # Update only the provided fields
    user_data.update(update_dict)

    # Save the updated user data back into the hash
    await redis_client.hset(cache_key, row_id, json.dumps(user_data))

    # Maintain order: Ensure the user exists in the ordered list
    list_key = f"{cache_key}:order"

    existing_order = await redis_client.lrange(list_key, 0, -1)

    if row_id not in existing_order:
        await redis_client.rpush(list_key, row_id) 

    print(f"User {row_id} updated in {cache_key}")



# DATETIME SERIALIZATION
def serialize_datetime(obj):
    """Helper function to convert datetime to string before JSON serialization"""
    if isinstance(obj, datetime):
        return obj.isoformat()  # Converts datetime to a string
    raise TypeError("Type not serializable")


#ADD TO CACHE
async def add_new_user_to_redis(cache_key: str, new_user: dict):
    """Add a new user to Redis Hash and maintain insertion order"""

    order_key = f"{cache_key}:order"  # Separate list to store order

    # Ensure the user has a unique identifier (assumed to be `username`)
    username = new_user.get("username")
    if not username:
        print("Error: User data must contain a 'username' field")
        return

    # Convert new user data to JSON format (for Redis storage)
    user_json = json.dumps(new_user, default=serialize_datetime)

    # Store the new user in the Redis Hash
    await redis_client.hset(cache_key, username, user_json)

    # Maintain order: Add user to the ordered list if not already present
    existing_order = await redis_client.lrange(order_key, 0, -1)

    if username not in existing_order:
        await redis_client.rpush(order_key, username)  # Append to order list

    print(f"New user {username} added to {cache_key} and order maintained")


# DELETE FROM CACHE
async def delete_user_from_redis(cache_key: str, username: str):
    """Delete a user from Redis Hash and remove from order list"""

    order_key = f"{cache_key}:order"  # Separate list to track order

    # Check if the user exists
    user_exists = await redis_client.hexists(cache_key, username)
    if not user_exists:
        print(f"User {username} not found in {cache_key}")
        return

    # Delete the user from Redis Hash
    await redis_client.hdel(cache_key, username)

    # Remove the username from the order list
    await redis_client.lrem(order_key, 0, username)

    print(f"User {username} deleted from {cache_key} and order list updated")



#API TO EDIT USER
@app.put("/update/{row_id}")
async def update_user(row_id: str, updated_data: DataModel, current: str = Query(...)):
    # Fetch the original row before updating
    original_row = users_collection.find_one({"username": row_id})
    print("in update")
    if not original_row:
        raise HTTPException(status_code=404, detail="Row not found")

    # Convert Pydantic model to dictionary, excluding unset fields
    update_dict = updated_data.dict(exclude_unset=True)

    # Identify changed fields and format as a string
    changes_made = []
    for key, new_value in update_dict.items():
        old_value = original_row.get(key, None)
        if old_value != new_value:  # Only store fields that have changed
            changes_made.append(f"{key} from '{old_value}' to '{new_value}'")

    if not changes_made:  
        return {"message": "No changes detected"}

    # Update the row
    result = users_collection.update_one(
        {"username": row_id},
        {"$set": update_dict}
    )


    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Row not found")
    
    # Update the cache
    await update_user_in_hash_cache("all_items", row_id, update_dict)
   
    
    # Prepare change log with formatted action
    action_string = f"Updated User {row_id}: " + ", ".join(changes_made)

    change_log = AuditModel(
        timestamp=datetime.utcnow(),
        username= f"User {current}",  
        userchanged=f"User {row_id}",  
        action=action_string  
    )

    # Insert the change log
    audit_collection.insert_one(change_log.dict())

    print("Return message")
    return {"message": "Row updated successfully", "changes": changes_made}

def get_user_by_username(username: str):
    user = users_collection.find_one({"username": username})  
    return user


#API TO ADD USER
@app.post("/add", status_code=status.HTTP_201_CREATED)
async def create_user(user: DataModel, current: str = Header(...)):
    print("API Endpoint Hit!")  
    print("Received Headers:", current) 
    # Check if the username already exists
    existing_user = get_user_by_username(user.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    # Validate and hash the password
    if not user.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required for new user creation."
        )

    user_data = user.dict()

    if "sdate" in user_data:
        user_data["sdate"] = convert_to_datetime(user_data["sdate"])

    user_data["password"] = hash_password(user.password)
    
    new_user = {
        "username": user_data["username"],
        "password": user_data["password"],
        "name": user_data["name"],
        "department": user_data["department"],
        "designation": user_data["designation"],
        "email": user_data["email"],
        "phone": user_data["phone"],
        "sdate": user_data["sdate"],
        "role": user_data["role"]
    }
    
    users_collection.insert_one(new_user)
    new_user.pop("_id", None)

    # ADD TO CACHE
    await add_new_user_to_redis("all_items", new_user)

    audit_log = AuditModel(
        timestamp=datetime.utcnow(), 
        username=f"User {current}",  
        userchanged= f"User {user_data["username"]}",  
        action=f"Added User {user_data['username']}"
    )

    # Insert the audit log
    audit_collection.insert_one(audit_log.dict())

    return {"message": "User added successfully!", "newUser": new_user}



#API TO DELETE USER
@app.delete("/delete/{row_id}")
async def delete_row(row_id: str, current: str = Header(...)):

    result = users_collection.delete_one(
        {"username": row_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Row not found")
    
    #Update Cache
    await delete_user_from_redis("all_items",row_id)

    
    audit_log = AuditModel(
        timestamp=datetime.utcnow(), 
        username=f"User {current}",  
        userchanged= f"User {row_id}",  
        action=f"Deleted User {row_id}"
    )

    #add to audits
    audit_collection.insert_one(audit_log.dict())


    return {"message": "Row deleted successfully"}


#API TO TEST REDIS CONNECTION
@app.get("/test_redis")
async def test_redis():
    """Test if Redis connection is working"""
    try:
        await redis_client.set("test_key", "Redis is connected!", ex=10)
        test_value = await redis_client.get("test_key")
        return {"message": test_value}
    except Exception as e:
        return {"error": str(e)}
    





