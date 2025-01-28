from datetime import date, datetime
from bson import ObjectId
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import validator
from auth import hash_password, verify_password, create_access_token, decode_access_token
from database import users_collection
from models import UserLogin, Token,DataModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

#To allow cors middleware to connect with frontend, without this cors error
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],  
)

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Fetch the user from the database
    user = users_collection.find_one({"username": form_data.username})
    print("Fetched user:", user)  

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    print("Plain password:", form_data.password)  
    print("Stored hashed password:", user["password"])  

    # Verify the password
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
    
    return {"access_token": access_token, "token_type": "bearer", "username": payload["username"], "role": payload["role"], "name": payload["name"]}
    


# @app.get("/protected")
# def protected(token: str = Depends(oauth2_scheme)):
#     print("Access Token:", token) 
#     payload = decode_access_token(token)
#     if not payload:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
#     return {"username": payload["sub"], "role": payload["role"]}

@app.get("/tabledata")
async def tableData():
    tdata = list(users_collection.find({},{"_id": 0}))
    return tdata

# @app.put("/update/{row_id}")
# async def updateData(row_id: str, updatedData: DataModel):
#     result = users_collection.update_one({"_id": row_id}, {"$set": updatedData.dict()})

#     if result.matched_count == 0:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Row not found")
#     return {"message": "Details Updated Successfully"}

def convert_to_datetime(value):
    """
    Converts a string or date to a datetime object.
    Ensures consistency when handling date fields.
    """
    if isinstance(value, str):
        try:
            # Convert string in "YYYY-MM-DD" format to datetime
            return datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Invalid date format. Expected 'YYYY-MM-DD'.")
    elif isinstance(value, date):
        # Convert date object to datetime
        return datetime.combine(value, datetime.min.time())
    elif isinstance(value, datetime):
        # Already a datetime object
        return value
    else:
        raise TypeError("Unsupported type for date conversion. Must be str, date, or datetime.")

@app.put("/update/{row_id}")
async def update_row(row_id: str, updated_data: DataModel):
    
    # Pydantic model to dictionary and excluding unset fields
   
    update_dict = updated_data.dict(exclude_unset=True)
    # if "sdate" in update_dict:
    #     #`date` to `datetime` for MongoDB compatibility
    #     update_dict["sdate"] = update_dict["sdate"].strftime("%Y-%m-%d")

    if "sdate" in update_dict:
        update_dict["sdate"] = convert_to_datetime(update_dict["sdate"])

    # if "sdate" in update_dict:
    # # Convert `sdate` if it's a string or validate it
    #     if isinstance(update_dict["sdate"], str):
    #         try:
    #             update_dict["sdate"] = datetime.strptime(update_dict["sdate"], "%Y-%m-%d")
    #         except ValueError:
    #             raise ValueError("Invalid date format for 'sdate'. Expected 'YYYY-MM-DD'.")

    # database update
    result = users_collection.update_one(
        {"username": row_id}, 
        {"$set": update_dict}  
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Row not found")

    return {"message": "Row updated successfully"}

def get_user_by_username(username: str):
    user = users_collection.find_one({"username": username})  
    return user

@app.post("/add", status_code=status.HTTP_201_CREATED)
async def create_user(user: DataModel):
    
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

    # if "sdate" in user_data and isinstance(user_data["sdate"], date):
    #     user_data["sdate"] = datetime.combine(user_data["sdate"], datetime.min.time())

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
    
    return {"username": user.username, "role": user.role}


@app.delete("/delete/{row_id}")
async def delete_row(row_id: str):
    result = users_collection.delete_one(
        {"username": row_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Row not found")
    
    return {"message": "Row deleted successfully"}


