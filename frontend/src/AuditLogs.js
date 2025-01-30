import React, { useState, useEffect } from "react";
import Navbar from './Navbar';
import axios from "axios";

function AuditLogs() {
  
  const [data, setData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [originalData, setOriginalData] = useState([]);

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

  const fetchTableData = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/audittabledata");
      return response.data;

    }catch(error){
      console.error("Error fetching table data", error)
      throw error;

    }
  };

  
    useEffect(() => {
      isLoading();
  
    }, []);
  
  
    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;
  

  return (
   
    <div className=" bg-gray-50">
        {/*Navbar*/}
        <div>
        <Navbar/>
        </div>

        <h2 className="text-3xl font-bold text-gray-800 text-center py-4 bg-gray-50 mt-4">Audit Logs</h2>
        
        <div className="overflow-x-auto rounded-lg max-w-[2000px] mx-auto flex justify-center p-6">
         
        
        <table className="min-w-full border shadow-md">
          {/* Table Header */}
          <thead className="bg-gray-100 text-xl">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Timestamp</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Changed By</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Changes To</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-gray-700 font-bold">Action</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="odd:bg-gray-50 even:bg-white text-lg">
                <td className="border border-gray-300 px-4 py-2">{row.timestamp}</td>
                <td className="border border-gray-300 px-4 py-2">{row.username}</td>
                <td className="border border-gray-300 px-4 py-2">{row.userchanged}</td>
                <td className="border border-gray-300 px-4 py-2">{row.action}</td>
               
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

}

export default AuditLogs;
