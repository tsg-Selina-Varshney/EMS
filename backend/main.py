from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from auth import hash_password, verify_password, create_access_token, decode_access_token
from database import users_collection
from models import UserLogin, Token
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

#To allow cors middleware to connect with frontend, without this cors error
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)


# @app.post("/token", response_model=Token)
# async def login(form_data: OAuth2PasswordRequestForm = Depends()):
#     # Check if the user exists in MongoDB
#     user = users_collection.find_one({"username": form_data.username})
#     if not user or not verify_password(form_data.password, user["password"]):
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
#     # Create JWT token
#     token_data = {"sub": user["username"], "role": user["role"]}
#     access_token = create_access_token(data=token_data)
#     return {"access_token": access_token, "token_type": "bearer"}

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
    token_data = {"sub": user["username"], "role": user["role"]}
    access_token = create_access_token(data=token_data)
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/protected")
async def protected(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return {"username": payload["sub"], "role": payload["role"]}
