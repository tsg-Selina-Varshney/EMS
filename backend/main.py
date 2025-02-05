from datetime import date, datetime
import json
from typing import List
from fastapi import FastAPI, Depends, HTTPException, Header, Query, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import validator
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

 
#REFRESH CACHE FUNCTION
async def refresh_cache(cache_key,collection):
    try:
        # Delete the existing cache
        await redis_client.delete(cache_key)
        print(f"Cache key '{cache_key}' deleted.")

        # Fetch fresh data from the database
        tdata = list(collection.find({}, {"_id": 0}))

        # Store the new data in Redis
        await redis_client.set(cache_key, json.dumps(tdata))
        print(f"Cache key '{cache_key}' refreshed with new data.")

        return {"message": "Cache refreshed successfully."}

    except Exception as e:
        print("Error refreshing cache:", e)
        return {"error": str(e)}
    

#API TO GET TABLE DATA WITHOUT SORTING
@app.get("/tabledata")
async def tableData():
    # Caching
    # cache_key = "all_items"

    cached_items = await redis_client.get("all_items")
    # Cache Hit
    if cached_items:
        print("Source: Redis")
        return json.loads(cached_items)
    # Cache Miss
    
    # find and list everything except the id field.
    tdata = list(users_collection.find({},{"_id": 0})) 

    # Store in redis
    await redis_client.set("all_items", json.dumps(tdata))
    print("/tabledata Source: DB and data put in redis")
    return tdata


#API TO GET AUDIT TABLE DATA
@app.get("/audittabledata")
async def audittableData():
    # Caching
    cache_key = "audit_items"
    cached_items = await redis_client.get(cache_key)
    # Cache Hit
    if cached_items:
        print("Source: Redis")
        return json.loads(cached_items)
    # Cache Miss
    tdata = list(audit_collection.find({},{"_id": 0}))
    # Since timestamp is not json serializable convert it to string before storing.
    for t in tdata:
        if "timestamp" in t:
            t["timestamp"] = t["timestamp"].isoformat()
    # Store in redis
    await redis_client.set(cache_key, json.dumps(tdata))
    print("Source: DB and data put in redis")
    return tdata


#APIS FOR FILTERING:

#COMMMON FUNCTION
def check_column(column):
    if column not in ["department", "designation"]:
        raise HTTPException(status_code=400, detail="Invalid column name")
    
    
#API TO GET THE UNIQUE VALUES AS PER THE COLUMN SELECTED
# @app.get("/unique/{column}")
# async def optionValues(column: str):
    
#     check_column(column)
  
#     unique_values = users_collection.distinct(column) 

#     return {"column": column, "unique_values": unique_values}

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
    sort_order = -1 if desc else 1
    # Caching
    cache_key = "all_items"
    cached_items = await redis_client.get(cache_key)

    if cached_items:
        data_list = json.loads(cached_items)
        sorted_data = sorted(data_list, key=lambda x: x[column], reverse=desc)
        return sorted_data
    
    users = list(users_collection.find().sort(column, sort_order))
    return users

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


#API TO EDIT
# @app.put("/update/{row_id}")
# async def update_row(row_id: str, updated_data: DataModel, current: str = Header(...)):
#     # Fetch the original row before updating
#     original_row = users_collection.find_one({"username": row_id})
#     print("in update");
#     if not original_row:
#         raise HTTPException(status_code=404, detail="Row not found")

#     # Convert Pydantic model to dictionary, excluding unset fields
#     update_dict = updated_data.dict(exclude_unset=True)

#     # Identify changed fields and format as a string
#     changes_made = []
#     for key, new_value in update_dict.items():
#         old_value = original_row.get(key, None)
#         if old_value != new_value:  # Only store fields that have changed
#             changes_made.append(f"{key} from '{old_value}' to '{new_value}'")

#     if not changes_made:  
#         return {"message": "No changes detected"}

#     # Update the row
#     result = users_collection.update_one(
#         {"username": row_id},
#         {"$set": update_dict}
#     )

#     if result.matched_count == 0:
#         raise HTTPException(status_code=404, detail="Row not found")
    
    
#     await refresh_cache("all_items") 
    
#     # Prepare change log with formatted action
#     action_string = f"Updated User {row_id}: " + ", ".join(changes_made)

#     change_log = AuditModel(
#         timestamp=datetime.utcnow(),
#         username= f"User {current}",  
#         userchanged=f"User {row_id}",  
#         action=action_string  
#     )

#     # Insert the change log into the `changes_collection`
#     audit_collection.insert_one(change_log.dict())
#     await refresh_cache("audit_items") 
#     print("Return message");
#     return {"message": "Row updated successfully", "changes": changes_made}



@app.put("/update/{row_id}")
async def update_user(row_id: str, updated_data: DataModel, current: str = Query(...)):
    # Fetch the original row before updating
    original_row = users_collection.find_one({"username": row_id})
    print("in update");
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
    
    
    await refresh_cache("all_items",users_collection) 
    
    # Prepare change log with formatted action
    action_string = f"Updated User {row_id}: " + ", ".join(changes_made)

    change_log = AuditModel(
        timestamp=datetime.utcnow(),
        username= f"User {current}",  
        userchanged=f"User {row_id}",  
        action=action_string  
    )

    # Insert the change log into the `changes_collection`
    audit_collection.insert_one(change_log.dict())

    await refresh_cache("audit_items",audit_collection) 

    print("Return message")
    return {"message": "Row updated successfully", "changes": changes_made}

def get_user_by_username(username: str):
    user = users_collection.find_one({"username": username})  
    return user


#API TO ADD
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
    await refresh_cache("all_items",users_collection) 

    audit_log = AuditModel(
        timestamp=datetime.utcnow(), 
        username=f"User {current}",  
        userchanged= f"User {user_data["username"]}",  
        action=f"Added User {user_data['username']}"
    )

    # Insert the change log into the changes collection
    audit_collection.insert_one(audit_log.dict())
    await refresh_cache("audit_items",audit_collection) 
    return {"message": "User added successfully!", "newUser": new_user}
    # return {"username": user.username, "role": user.role}


#API TO DELETE
@app.delete("/delete/{row_id}")
async def delete_row(row_id: str, current: str = Header(...)):

    result = users_collection.delete_one(
        {"username": row_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Row not found")
    
    await refresh_cache("all_items",users_collection) 
    
    audit_log = AuditModel(
        timestamp=datetime.utcnow(), 
        username=f"User {current}",  
        userchanged= f"User {row_id}",  
        action=f"Deleted User {row_id}"
    )
    audit_collection.insert_one(audit_log.dict())
    await refresh_cache("audit_items",audit_collection) 
    
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
    





