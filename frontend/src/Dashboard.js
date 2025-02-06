import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import {
  PencilIcon,
  TrashIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  ArrowDownIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/outline";
import ClipLoader from "react-spinners/ClipLoader";
import axios from "axios";
import { authService } from "./services/authService";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = authService.getUser();
  // const [user, setUser] = useState(authService.getUser());
  const getRole = user?.role || "";
  const getUsername = user?.username || "";
  // States for tableData and Filtering
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // To differentiate Add vs Edit
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  //for filtering , selecting filtering by what
  const [filterBy, setFilterBy] = useState("");
  //selected option in that filter
  const [selectedField, setSelectedField] = useState("");
  //all options
  const [fieldOptions, setFieldOptions] = useState([]);
  const [ascending, setAscending] = useState({
    username: true,
    name: true,
    sdate: true,
  });
  //form states
  const [formErrors, setFormErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const today = new Date().toISOString().split("T")[0];

  const fetchDropdownValues = async (column) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/unique/${column}`
      );
      if (column === "department") {
        setDepartments(response.data.unique_values);
      } else if (column === "designation") {
        setDesignations(response.data.unique_values);
      }
    } catch (error) {
      console.error(`Error fetching ${column} data:`, error);
    }
    setLoading(false);
  };

  //FETCHING TABLE DATA
  const fetchTableData = async (column = null, desc = false) => {
    try {
      let url = column
        ? `http://127.0.0.1:8000/sort?column=${column}&desc=${desc}`
        : "http://127.0.0.1:8000/tabledata";
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching table data", error);
      throw error;
    }
  };

  //FETCHING TABLE DATA ON USE EFFECT
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchTableData();
        setData(result);
        setOriginalData(result);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchDropdownValues("department");
    fetchDropdownValues("designation");
  }, []);

  // REDIRECT TO LOGIN IF NO USER FOUND
  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // IF STILL LOADING
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <ClipLoader loading={loading} size={150} aria-label="Loading Spinner" />
        <p className="mt-4 text-lg font-semibold text-gray-700">Loading...</p>
      </div>
    );

  //IF ERROR
  if (error) return <p>Error: {error}</p>;

  //HANDLE CLICKS ADD AND EDIT
  const handleAddClick = () => {
    setIsEditMode(false); //Add Mode
    setEditRow(null); // Reset
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEditClick = (row) => {
    setIsEditMode(true);
    setEditRow({ ...row });
    setIsModalOpen(true);
  };

  //SEARCHING
  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();

    setSearchTerm(value);

    if (value === "") {
      // Reset table when search is cleared
      setData(originalData);
      return;
    }

    // Filter original data for matching search results
    const newData = originalData.filter((row) =>
      Object.values(row).some((val) =>
        val.toString().toLowerCase().includes(value)
      )
    );
    // Update table with search results
    setData(newData);
  };

  //HANDLE DELETE
  const handleDelete = async (row) => {
    if (!row || !row.username) {
      alert("No row selected for deletion.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this row?")) {
      try {
        console.log("Deleting row:", row);

        const response = await axios.delete(
          `http://127.0.0.1:8000/delete/${row.username}`,
          {
            headers: {
              "Content-Type": "application/json",
              current: getUsername,
            },
          }
        );

        alert(response.data.message);

        // Update state by removing the deleted row
        const updatedData = data.filter(
          (item) => item.username !== row.username
        );
        setData(updatedData);

        setIsModalOpen(false);
      } catch (error) {
        console.error("Error deleting data:", error);
        alert("Failed to delete data.");
      }
    }
  };

  //ADDING NEW USER
  const handleAddSave = async (event) => {
    if (event) event.preventDefault();

    if (!validateForm(isEditMode)) {
      return;
    }

    console.log("editRow data:", editRow);

    try {
      const response = await axios.post("http://127.0.0.1:8000/add", editRow, {
        headers: {
          "Content-Type": "application/json",
          current: getUsername,
        },
      });

      console.log("Response from backend:", response.data);
      alert("User added successfully!");

      setData((prevData) => [...prevData, response.data.newUser]);

      setIsModalOpen(false);
    } catch (error) {
      if (error.response) {
        // Backend responded with an error like 400 Bad Request)
        console.error("Error response:", error.response.data);
        alert("Error: " + JSON.stringify(error.response.data));
        setIsModalOpen(false);
      } else if (error.request) {
        // Request was made but no response received
        console.error("Error request:", error.request);
        alert("Network error. Please try again.");
        setIsModalOpen(false);
      } else {
        // Other errors
        console.error("Error:", error.message);
        alert("Error: " + error.message);
        setIsModalOpen(false);
      }
    }
  };

  //EDITING EXISTING USER
  const handleSave = async (event) => {
    if (event) event.preventDefault();

    if (!validateForm(isEditMode)) {
      return;
    }

    try {
      console.log("Updating data for:", editRow);

      const response = await axios.put(
        `http://127.0.0.1:8000/update/${editRow.username}?current=${getUsername}`,
        editRow
      );

      console.log("Response received:", response);

      if (response.status === 200) {
        console.log("Update successful!");

        const loggedInUser = JSON.parse(localStorage.getItem("user"));

        if (editRow.username === loggedInUser.username) {
          const updatedUser = { ...loggedInUser, name: editRow.name };

          authService.setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      } else {
        console.warn("Response not 200:", response.status);
      }

      const updatedData = data.map((row) =>
        row.username === editRow.username ? { ...editRow } : row
      );

      setData(updatedData);
      alert(response.data.message);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error updating data:", error);
      alert("Failed to update data.");
      setIsModalOpen(false);
    }
  };

  //HANDLING FILTER
  const handleFilter = async (column) => {
    setFilterBy(column);
    setSelectedField("");
    if(column==="department"){
      setFieldOptions(departments)
    }
    else if (column==="designation"){
      setFieldOptions(designations)
    }
  };

  const handleFieldSelection = async (value) => {
    setSelectedField(value);

    if (value === "") {
      setData(originalData);
      return;
    }
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/filter/${filterBy}/${value}`
      );
      setData(response.data);
    } catch (error) {
      console.error("Error filtering data:", error);
    }
  };

  const removeFilters = () => {
    setSearchTerm("");
    setFilterBy("");
    setSelectedField("");
    setData(originalData);
  };

  //SORTING
  const handleSort = async (column) => {
    try {
      setLoading(true);

      const currentOrder = ascending[column] ?? true;
      const newOrder = !currentOrder;

      const sortedData = await fetchTableData(column, newOrder);

      setData(sortedData);

      setAscending((prev) => ({
        ...prev,
        [column]: newOrder,
      }));
    } catch (error) {
      console.error("Error fetching sorted data:", error);
    } finally {
      setLoading(false);
    }
  };

  //FORM HANDLE CHANGE
  const handleChange = (e) => {
    const { id, value } = e.target; 
    setEditRow((prev) => ({
      ...prev,
      [id]: value, 
    }));
  };

  //FORM VALIDATIONS
  const validateForm = (isEditMode) => {
    let validationErrors = {};

    if (!editRow || typeof editRow !== "object") {
      validationErrors.username = "All form data is missing.";
      setFormErrors(validationErrors);
      return false;
    }
    if (!isEditMode) {
      // EID (Username) Required, 5-digit numeric only
      if (!editRow.username) {
        validationErrors.username = "EID is required.";
      } else if (!/^\d{5}$/.test(editRow.username)) {
        validationErrors.username = "EID must be exactly 5 numeric digits.";
      }

      // Password - Required, Strong (8+ chars, uppercase, lowercase, number, special char)
      if (!editRow.password) {
        validationErrors.password = "Password is required.";
      } else if (
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
          editRow.password
        )
      ) {
        validationErrors.password =
          "Password must be at least 8 characters, include one uppercase letter, one lowercase letter, one number, and one special character.";
      }
      //Role
      if (!editRow.role) {
        validationErrors.role = "Role is required.";
      }
    }

    // Name Required
    if (!editRow.name) {
      validationErrors.name = "Name is required.";
    }
    //Department Required
    if (!editRow.department) {
      validationErrors.department = "Department selection is required.";
    }
    //Designation Required
    if (!editRow.designation) {
      validationErrors.designation = "Designation selection is required.";
    }

    // Email - Required, Valid Format
    if (!editRow.email) {
      validationErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editRow.email)) {
      validationErrors.email = "Invalid email format.";
    }
    //Phone required - 10 numbers
    if (!editRow.phone) {
      validationErrors.phone = "Phone Number is required.";
    } else if (!/^\d{10}$/.test(editRow.phone)) {
      validationErrors.phone = "Phone Number must be 10 numeric digits.";
    }
    //Start Date required
    if (!editRow.sdate) {
      validationErrors.sdate = "Start Date is required.";
    }

    setFormErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  //MAIN BODY
  return (
    <div className="bg-gray-50">
      {/*Navbar*/}
      <div>
        <Navbar />
      </div>

      <div className="flex items-center">
        <div className="flex items-center w-[600px] border-2 border-gray-500  hover:bg-gray-200 rounded-lg px-3 py-2 mt-6 ml-6 p-4">
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search..."
            className="flex-1 outline-none bg-transparent"
            value={searchTerm}
            onChange={handleSearch}
          />

          {/* Search Icon on the Right */}
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
        </div>

        <div>
          <select
            onChange={(e) => handleFilter(e.target.value)}
            className="border-2 border-gray-500  hover:bg-gray-200 rounded-lg px-3 py-2 mt-6 ml-6 p-4"
          >
            <option value="">Filter by </option>
            <option value="department">Filter by Department</option>
            <option value="designation">Filter by Designation</option>
          </select>

          {filterBy && (
            <select
              onChange={(e) =>
                e.target.value
                  ? handleFieldSelection(e.target.value)
                  : removeFilters()
              }
              value={selectedField}
              className="border-2 border-gray-500  hover:bg-gray-200 rounded-lg px-3 py-2 mt-6 ml-6 p-4"
            >
              <option value=""> All</option>
              {fieldOptions.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </div>

        {/*Add Button with visibility check*/}
        {getRole === "Admin" && (
          <div className="flex justify-end mt-6 pr-4 ml-6">
            <button
              className="flex items-center px-3 py-2  bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={handleAddClick}
            >
              <PlusCircleIcon className="h-5 w-6 mr-2" />
              Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full border border-gray-300">
            {/* Table Header */}
            <thead className="bg-gray-100 text-xl">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">
                  <div class="flex items-center justify-between w-full">
                    <span>EID</span>
                    {ascending["username"] === true ? (
                      <ArrowUpIcon
                        className="w-5 h-5 text-gray-500 cursor-pointer"
                        onClick={() => handleSort("username")}
                      />
                    ) : (
                      <ArrowDownIcon
                        className="w-5 h-5 text-gray-500 cursor-pointer"
                        onClick={() => handleSort("username")}
                      />
                    )}
                  </div>
                </th>

                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">
                  <div class="flex items-center justify-between w-full">
                    <span>Name</span>
                    {ascending["name"] === true ? (
                      <ArrowUpIcon
                        className="w-5 h-5 text-gray-500 cursor-pointer"
                        onClick={() => handleSort("name")}
                      />
                    ) : (
                      <ArrowDownIcon
                        className="w-5 h-5 text-gray-500 cursor-pointer"
                        onClick={() => handleSort("name")}
                      />
                    )}
                  </div>
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">
                  Department
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">
                  Designation
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">
                  Email
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">
                  Phone Number
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">
                  <div class="flex items-center justify-between w-full">
                    <span>Start Date</span>
                    {ascending["sdate"] === true ? (
                      <ArrowUpIcon
                        className="w-5 h-5 text-gray-500 cursor-pointer"
                        onClick={() => handleSort("sdate")}
                      />
                    ) : (
                      <ArrowDownIcon
                        className="w-5 h-5 text-gray-500 cursor-pointer"
                        onClick={() => handleSort("sdate")}
                      />
                    )}
                  </div>
                </th>
                {getRole === "Admin" && (
                  <>
                    <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">
                      Role
                    </th>
                  </>
                )}
                <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}

            <tbody>
              {data.length > 0 ? (
                data.map((row, index) => (
                  <tr
                    key={index}
                    className="odd:bg-gray-50 even:bg-white text-lg"
                  >
                    <td className="border border-gray-300 px-4 py-2">
                      {row.username}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {row.name}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {row.department}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {row.designation}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {row.email}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {row.phone}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {row.sdate}
                    </td>
                    {getRole === "Admin" && (
                      <>
                        <td className="border border-gray-300 px-4 py-2">
                          {row.role}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-2 flex space-x-2">
                      {(getRole === "Admin" ||
                        row.username === getUsername) && (
                        <>
                          {/* Edit Button */}
                          <button
                            className="p-2 text-blue-500 hover:bg-gray-100 rounded-md border-2 border-black"
                            onClick={() => handleEditClick(row)}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}

                      {getRole === "Admin" && (
                        <>
                          {/* Delete Button */}
                          <button
                            className="p-2 text-red-500 hover:bg-gray-100 rounded-md border-2 border-black"
                            onClick={() => handleDelete(row)}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center p-4">
                    No results found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-[600px]">
              <h2 className="text-2xl font-bold mb-4">
                {isEditMode ? "Edit Details" : "Add Details"}
              </h2>

              {/*Form*/}
              <form className="space-y-5">
                {/* Username Field */}
                {!isEditMode && (
                  <div className="mb-4">
                    <label
                      htmlFor="username"
                      className="block text-xl font-medium text-gray-700"
                    >
                      EID
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={editRow?.username || ""}
                      maxLength={5}
                      onChange={handleChange}
                      className="mt-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                    />
                    {formErrors.username && (
                      <p className="text-red-500 mt-2">{formErrors.username}</p>
                    )}
                  </div>
                )}

                {/* Password Field */}

                {!isEditMode && (
                  <div className="mb-4">
                    <label
                      htmlFor="password"
                      className="block text-xl font-medium text-gray-700"
                    >
                      Password
                    </label>
                    <input
                      type="text"
                      id="password"
                      value={editRow?.password || ""}
                      onChange={handleChange}
                      className="mt-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                    />
                    {formErrors.password && (
                      <p className="text-red-500 mt-2">{formErrors.password}</p>
                    )}
                  </div>
                )}

                {/* Name Field */}

                <div className="mb-4">
                  <label
                    htmlFor="username"
                    className="block text-xl font-medium text-gray-700"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={editRow?.name || ""}
                    onChange={handleChange}
                    className="mt-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 mt-2">{formErrors.name}</p>
                  )}
                </div>

                {/* Department Field*/}

                <div className="mb-4">
                  <label
                    htmlFor="department"
                    className="block text-xl font-medium text-gray-700"
                  >
                    Department
                  </label>
                  <select
                    id="department"
                    value={editRow?.department || ""}
                    onChange={handleChange}
                    className="mt-2 block w-full border-gray-500 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg pt-3 pb-3"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept, index) => (
                      <option key={index} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  {formErrors.department && (
                    <p className="text-red-500 mt-2">{formErrors.department}</p>
                  )}
                </div>

                {/* Designation Field*/}

                <div className="mb-4">
                  <label
                    htmlFor="designation"
                    className="block text-xl font-medium text-gray-700"
                  >
                    Designation
                  </label>
                  <select
                    id="designation"
                    value={editRow?.designation || ""}
                    onChange={handleChange}
                    className="mt-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg pt-3 pb-3"
                  >
                    <option value="">Select Designation</option>
                    {designations.map((desig, index) => (
                      <option key={index} value={desig}>
                        {desig}
                      </option>
                    ))}
                  </select>
                  {formErrors.designation && (
                    <p className="text-red-500 mt-2">
                      {formErrors.designation}
                    </p>
                  )}
                </div>

                {/* Email Field */}

                <div className="mb-4">
                  <label
                    htmlFor="email"
                    className="block text-xl font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={editRow?.email || ""}
                    onChange={handleChange}
                    className="mt-2 text-lg block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {formErrors.email && (
                    <p className="text-red-500 mt-2">{formErrors.email}</p>
                  )}
                </div>

                {/* Phone Number */}

                <div className="mb-4">
                  <label
                    htmlFor="phone"
                    className="block text-xl font-medium text-gray-700"
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    maxLength={10}
                    value={editRow?.phone || ""}
                    onChange={handleChange}
                    className="mt-2 text-lg block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {formErrors.phone && (
                    <p className="text-red-500 mt-2">{formErrors.phone}</p>
                  )}
                </div>

                {/* Start date Field*/}
                <div className="mb-4">
                  <label
                    htmlFor="sdate"
                    className="block text-xl font-medium text-gray-700"
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="sdate"
                    max={today}
                    value={editRow?.sdate || ""}
                    onChange={handleChange}
                    className="custom-date mt-2 text-lg block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {formErrors.sdate && (
                    <p className="text-red-500 mt-2">{formErrors.sdate}</p>
                  )}
                </div>

                {/* Role Field*/}
                {!isEditMode && (
                  <div className="mb-4">
                    <label
                      htmlFor="role"
                      className="block text-xl font-medium text-gray-700"
                    >
                      Role
                    </label>
                    <select
                      id="role"
                      value={editRow?.role || ""}
                      onChange={handleChange}
                      className="mt-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg pt-3 pb-3"
                    >
                      <option value="">Select Role</option>
                      <option value="Admin">Admin</option>
                      <option value="Employee">Employee</option>
                    
                    </select>
                    {formErrors.role && (
                    <p className="text-red-500 mt-2">{formErrors.role}</p>
                  )}
                 
                  </div>
                )}

                {/* Submit Button */}

                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={(event) =>
                      isEditMode ? handleSave(event) : handleAddSave(event)
                    }
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
