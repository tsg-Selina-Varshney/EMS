import React, { useState, useEffect } from "react";
import Navbar from './Navbar';
import { PencilIcon, TrashIcon, PlusCircleIcon, MagnifyingGlassIcon, ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import { authService } from "./services/authService";
import { useNavigate } from 'react-router-dom';



export default function Dashboard() {
  // const getRole = localStorage.getItem("role");
  // const getUsername = localStorage.getItem("username");



  const navigate = useNavigate();
  const user = authService.getUser();

  // Redirect to login if no user is found
  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);
  
  
  const getRole = user?.role || "";
  const getUsername = user?.username || "";

  const [data, setData] = useState([]); 
  const [originalData, setOriginalData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [editRow, setEditRow] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditMode, setIsEditMode] = useState(false); // To differentiate Add vs Edit
  const [searchTerm, setSearchTerm] = useState(""); //for searching
  
  const [filterBy, setFilterBy] = useState("");//for filtering , selecting filtering by what
  const [selectedField, setSelectedField] = useState("");//selected option in that filter
  const [fieldOptions, setFieldOptions] = useState([]);//all options

  const [ascending, setAscending] = useState({ username: true, name: true, sdate: true});
  

  


  const isLoading = async () => {
    
    try{
      const result = await fetchTableData();
      setData(result);
      setOriginalData(result);
    }catch(error){
      setError(error.message);

    }finally{
      setLoading(false);
    }
  };


  // const fetchTableData = async (column = "username", desc = false)  => {
  //   try {
  //     // const response = await axios.get("http://127.0.0.1:8000/tabledata");
  //     const response = await axios.get(`http://127.0.0.1:8000/sort?column=${column}&desc=${desc}`);
  //     return response.data;

  //   }catch(error){
  //     console.error("Error fetching table data", error)
  //     throw error;

  //   }
  // };

  const fetchTableData = async (column = null, desc = false) => {
    try {
      let url = column ? `http://127.0.0.1:8000/sort?column=${column}&desc=${desc}` : "http://127.0.0.1:8000/tabledata"; 
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching table data", error);
      throw error;
    }
  };
  



  useEffect(() => {
    isLoading();

  }, []);


  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  const handleAddClick = () => {
    setIsEditMode(false); //Add Mode
    setEditRow(null); // Reset
    setIsModalOpen(true); 
  };

  const handleEditClick = (row) => {
    setIsEditMode(true); 
    setEditRow({ ...row }); 
    setIsModalOpen(true); 
  };

  // const handleSearch = (e) => {
  //   const value = e.target.value.toLowerCase();
  //   setSearchTerm(value);

  //   const newData = data.filter((row) =>
  //     Object.values(row).some(
  //       (val) => val.toString().toLowerCase().includes(value)
  //     )
  //   );
  //   setFilteredData(newData);
  
  // };
  
  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);

    if (value === "") {
      setData(originalData); // Reset table when search is cleared
      return;
    }

    // Filter original data for matching search results
    const newData = originalData.filter((row) =>
      Object.values(row).some(
        (val) => val.toString().toLowerCase().includes(value)
      )
    );

    setData(newData); // Update table with search results
  };



//   const handleDelete = async (row) => {
//     setEditRow({ ...row }); 
//     console.log("editRow before deletion:", editRow); // Debugging statement
//     if (!editRow || !editRow.username) {
//     alert("No row selected for deletion.");
//     return;
//     }
//     if (window.confirm("Are you sure you want to delete this row?")) {
//       try{
//         console.log(editRow);
//         const response = await axios.delete(
//           `http://127.0.0.1:8000/delete/${editRow.username}`,
//           editRow
//         );
//         alert(response.data.message); 
        
//         const updatedData = data.map((row) =>
//           row === editRow ? { ...editRow } : row
//         );
//         setData(updatedData);
//         setIsModalOpen(false); 
//   } catch (error) {
//     console.error("Error deleting data:", error);
//     alert("Failed to delete data.");
//   }
//   }
// };

const handleDelete = async (row) => {
  console.log("Row selected for deletion:", row); // Debugging statement

  if (!row || !row.username) {
    alert("No row selected for deletion.");
    return;
  }

  if (window.confirm("Are you sure you want to delete this row?")) {
    try {
      console.log("Deleting row:", row);
      
      
      const response = await axios.delete(
        `http://127.0.0.1:8000/delete/${row.username}`
      );

      alert(response.data.message);

      // Update local state by removing the deleted row
      const updatedData = data.filter((item) => item.username !== row.username);
      setData(updatedData);

      
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error deleting data:", error);
      alert("Failed to delete data.");
    }
  }
};


const handleAddSave = async () => {
  // Print the editRow variable to the console
  console.log("editRow data:", editRow);

  try {
    
    const response = await axios.post("http://127.0.0.1:8000/add", editRow, {
      headers: {
        "Content-Type": "application/json",
        "current": getUsername
      },
    });

    
    console.log("Response from backend:", response.data);
    alert("User added successfully!");
  } catch (error) {
    
    if (error.response) {
      // Backend responded with an error (e.g., 400 Bad Request)
      console.error("Error response:", error.response.data);
      alert("Error: " + JSON.stringify(error.response.data)); 
    } else if (error.request) {
      // Request was made but no response received
      console.error("Error request:", error.request);
      alert("Network error. Please try again.");
    } else {
      // Other errors (e.g., Axios setup issues)
      console.error("Error:", error.message);
      alert("Error: " + error.message);
    }
  }
};


  const handleSave = async () => {
    try {
      
      const response = await axios.put(
        `http://127.0.0.1:8000/update/${editRow.username}`,
        editRow,{
          headers: {
            "Content-Type": "application/json",
            "current": getUsername
          },
        });
      

      alert(response.data.message); 

      const updatedData = data.map((row) =>
            row === editRow ? { ...editRow } : row
          );
          setData(updatedData);
          setIsModalOpen(false); 
    } catch (error) {
      console.error("Error updating data:", error);
      alert("Failed to update data.");
    }
  };

  const handleFilter = async (column) => {
    setFilterBy(column);
    setSelectedField("");

    try {
      const response = await axios.get(`http://127.0.0.1:8000/unique/${column}`);
      setFieldOptions(response.data.unique_values);
    } catch (error) {
      console.error("Error fetching unique values:", error);
    }
  };

  const handleFieldSelection = async (value) => {
    setSelectedField(value);

    if (value === "") {
      setData(originalData);
      return;
    }

    try {
      const response = await axios.get(`http://127.0.0.1:8000/filter/${filterBy}/${value}`);
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
  
  
  
  
  

  
  return (
    <div className="bg-gray-50">

        {/*Navbar*/}
        <div>
            <Navbar/>
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
        onChange = {(e) => handleFilter(e.target.value)}
        className="border-2 border-gray-500  hover:bg-gray-200 rounded-lg px-3 py-2 mt-6 ml-6 p-4"
      >
        <option value="">Filter by </option>
        <option value="department">Filter by Department</option>
        <option value="designation">Filter by Designation</option>
      </select>

      {filterBy && (
        <select onChange={(e) => e.target.value? handleFieldSelection(e.target.value) : removeFilters()} className="border-2 border-gray-500  hover:bg-gray-200 rounded-lg px-3 py-2 mt-6 ml-6 p-4">
          <option value=""> All</option>
          {fieldOptions.map((option, index) => (
            <option key={index} value={option}>{option}</option>
          ))}
        </select>
      )}

    </div>

     {/*Add Button with visibility check*/}
     {getRole === "Admin" && (
          <div className="flex justify-end mt-6 pr-4 ml-6">
          <button className="flex items-center px-3 py-2  bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={handleAddClick}>
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
                    {/* EID */}
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
                    <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Department</th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Designation</th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Email</th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Phone Number</th>
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
                    {(getRole === "Admin") && (
                        <>
                        <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Role</th>
                        </>
                      )}
                    <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Actions</th>
                  </tr>
                </thead>

                {/* Table Body */}

                <tbody>

                

                {data.length > 0 ? (
                  data.map((row, index) => (

                    
                    <tr key={index} className="odd:bg-gray-50 even:bg-white text-lg">
                      <td className="border border-gray-300 px-4 py-2">{row.username}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.name}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.department}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.designation}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.email}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.phone}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.sdate}</td>
                      {(getRole === "Admin") && (
                        <>
                        <td className="border border-gray-300 px-4 py-2">{row.role}</td>
                        </>
                      )}
                      <td className="px-4 py-2 flex space-x-2">
                      
                      {(getRole === "Admin" || row.username === getUsername) && (
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
                        <button className="p-2 text-red-500 hover:bg-gray-100 rounded-md border-2 border-black" 
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
                  onChange={(e) =>
                    setEditRow((prev) => ({ ...prev, username: e.target.value }))
                  }
                  className="mt-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                />
              </div>

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
                    onChange={(e) =>
                    setEditRow((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="mt-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                  />
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
                  onChange={(e) =>
                    setEditRow((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="mt-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                />
              </div>


              {/* Department Field*/}

              <div className="mb-4">
                <label
                  htmlFor="department"
                  className="block text-xl font-medium text-gray-700"
                >
                  Department
                </label>
                <input
                  type="text"
                  id="department"
                  value={editRow?.department || ""}
                  onChange={(e) =>
                    setEditRow((prev) => ({ ...prev, department: e.target.value }))
                  }
                  className="mt-2 text-lg block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Designation Field*/}

              <div className="mb-4">
                <label
                  htmlFor="designation"
                  className="block text-xl font-medium text-gray-700"
                >
                  Designation
                </label>
                <input
                  type="text"
                  id="designation"
                  value={editRow?.designation || ""}
                  onChange={(e) =>
                    setEditRow((prev) => ({ ...prev, designation: e.target.value }))
                  }
                  className="mt-2 text-lg block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
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
                  value={editRow?.email  || ""}
                  onChange={(e) =>
                    setEditRow((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="mt-2 text-lg block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
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
                  pattern="[0-9]{10}"
                  title="Please enter a 10-digit phone number"
                  required
                  value={editRow?.phone || ""}
                  onChange={(e) =>
                    setEditRow((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="mt-2 text-lg block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
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
                    value={editRow?.sdate || ""}
                    onChange={(e) =>
                      setEditRow((prev) => ({ ...prev, sdate: e.target.value }))
                    }
                    className="custom-date mt-2 text-lg block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
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
                <input
                  type="text"
                  id="role"
                  value={editRow?.role || ""}
                  onChange={(e) =>
                    setEditRow((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className="mt-2 text-lg block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
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
                    
                    onClick={() => (isEditMode ? handleSave() : handleAddSave())}
                   
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
