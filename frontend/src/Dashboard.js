
import React, { useState } from "react";
import Navbar from './Navbar';
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

const initialData = [
  { EID: 87615, Name: "Ishaan", Department: "Row 1 Col 2", Designation: "Row 1 Col 3", Email: "Row 1 Col 4", Phone: "Row 1 Col 5", StartDate: "Row 1 Col 6" },
  { EID: 23456, Name: "Girish", Department: "Row 2 Col 2", Designation: "Row 2 Col 3", Email: "Row 2 Col 4", Phone: "Row 2 Col 5", StartDate: "Row 2 Col 6" },
  { EID: 29874, Name: "Shiya", Department: "Row 3 Col 2", Designation: "Row 3 Col 3", Email: "Row 3 Col 4", Phone: "Row 3 Col 5", StartDate: "Row 3 Col 6" },
];

export default function Dashboard() {
  const [data, setData] = useState(initialData); // Table data
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal state
  const [editRow, setEditRow] = useState(null); // Row being edited
  const [editValues, setEditValues] = useState({
    EID: "",
    Name: "",
    Department: "",
    Designation: "",
    Email: "",
    Phone: "",
    StartDate: "",
  });

  const handleEditClick = (row) => {
    setEditRow(row); // Set the current row being edited
    setEditValues({ ...row }); // Populate modal with row values
    setIsModalOpen(true); // Open modal
  };

  const handleDelete = (rowID) => {
    if (window.confirm("Are you sure you want to delete this row?")) {
    const updatedData = data.filter((row) => row.EID!== rowID);
    setData(updatedData);
    }
  };

  const handleSave = () => {
    // Update the data array with the edited values
    const updatedData = data.map((row) =>
      row === editRow ? { ...editValues } : row
    );
    setData(updatedData);
    setIsModalOpen(false); // Close the modal
  };

  return (
    <div>
        <div>
            <Navbar/>
        </div>

    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Table */}
    <div className="overflow-x-auto bg-white rounded-lg shadow-md">
      <table className="min-w-full border border-gray-300">
          {/* Table Header */}
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">EID</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Name</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Department</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Designation</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Email</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Phone Number</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Start</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="odd:bg-gray-50 even:bg-white">
                <td className="border border-gray-300 px-4 py-2">{row.EID}</td>
                <td className="border border-gray-300 px-4 py-2">{row.Name}</td>
                <td className="border border-gray-300 px-4 py-2">{row.Department}</td>
                <td className="border border-gray-300 px-4 py-2">{row.Designation}</td>
                <td className="border border-gray-300 px-4 py-2">{row.Email}</td>
                <td className="border border-gray-300 px-4 py-2">{row.Phone}</td>
                <td className="border border-gray-300 px-4 py-2">{row.StartDate}</td>
                <td className="border border-gray-300 px-4 py-2 flex space-x-2">
                  {/* Edit Button */}
                  <button
                    className="p-2 text-blue-500 hover:bg-gray-100 rounded-md"
                    onClick={() => handleEditClick(row)}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  {/* Delete Button */}
                  <button className="p-2 text-red-500 hover:bg-gray-100 rounded-md" onClick={() => handleDelete(row.EID)}>
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[600px]">
            <h2 className="text-xl font-bold mb-4">Edit Details</h2>
            <div className="space-y-4">
              {Object.keys(editValues).map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700">
                    {key}
                  </label>
                  <input
                    type="text"
                    value={editValues[key]}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
