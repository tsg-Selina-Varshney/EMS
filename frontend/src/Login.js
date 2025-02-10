import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Login.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { authService } from "./services/authService";
const BURL = window.REACT_APP_API_URL || process.env.REACT_APP_API_URL;



function Login() {
  //hi
  console.log("API URL:", BURL);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  useEffect(() => {
    authService.clearUser(); // Clear session data
  }, []);

  const handleSignIn = async (e) => {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await axios.post(
        `${BURL}/token`,
        {
          username,
          password,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      console.log("Response:", response.data);

      if (response.data.access_token) {
        authService.setUser({
          token: response.data.access_token,
          username: response.data.username,
          role: response.data.role,
          name: response.data.name,
        });
        navigate("/dashboard");
      } else {
        console.error("Authentication failed");
      }
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      alert("Login failed! Check your username and password.");
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible((prevState) => !prevState);
  };

  // Login Page
  return (
    <div className="body h-screen flex bg-cover bg-center">
      {/* Left Section */}

      <div class="flex-1"></div>

      {/* Middle Section */}

      <div class=" middle w-full max-w-4xl shadow-4xl rounded flex items-center justify-center">
        <form class="w-full px-10 pt-10 pb-8 mx-6 mb-6 bg-white shadow-xl">
          <div class="mb-10">
            <h1 class="block text-gray-700 text-3xl font-bold">Welcome Back</h1>
          </div>

          <div class="mb-8">
            <label
              class="block text-gray-700 text-2xl font-bold mb-4"
              for="username"
            >
              Username
            </label>

            <input
              class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-xl"
              id="username"
              type="text"
              placeholder="Enter User ID"
              name="username"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div class="mb-8">
            <label
              class="block text-gray-700 text-2xl font-bold mb-4"
              for="password"
            >
              Password
            </label>

            <div className="relative mt-2">
              <input
                class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-xl"
                id="password"
                type={passwordVisible ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter Password"
              />

              <FontAwesomeIcon
                icon={passwordVisible ? faEyeSlash : faEye}
                className="absolute inset-y-3 right-3 flex items-center text-gray-500 cursor-pointer"
                onClick={togglePasswordVisibility}
              />
            </div>
          </div>

          <div class="flex items-center justify-between">
            <button
              class="bg-blue-500 hover:bg-blue-700 text-white text-lg font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="button"
              onClick={handleSignIn}
            >
              Sign In
            </button>
          </div>
        </form>
      </div>

      {/* Right Section */}

      <div class="flex-1"></div>
    </div>
  );
}

export default Login;
