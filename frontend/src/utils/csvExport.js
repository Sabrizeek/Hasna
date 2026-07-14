/**
 * Converts an array of objects into a CSV string and triggers a browser download.
 * 
 * @param {Array<Object>} data - The array of data objects to export.
 * @param {string} filename - The name of the downloaded file (e.g. "users.csv").
 * @param {Array<{header: string, key: string|Function}>} columns - Column configuration.
 */
export const downloadCSV = (data, filename, columns) => {
  if (!data || !data.length) {
    alert("No data available to export.");
    return;
  }

  // Generate CSV Header
  const headers = columns.map(col => `"${col.header.replace(/"/g, '""')}"`);
  
  // Generate CSV Rows
  const rows = data.map(row => {
    return columns.map(col => {
      let cellValue = typeof col.key === 'function' ? col.key(row) : row[col.key];
      
      // Handle null/undefined
      if (cellValue === null || cellValue === undefined) {
        cellValue = "";
      } else {
        cellValue = String(cellValue);
      }

      // Escape quotes and wrap in quotes
      return `"${cellValue.replace(/"/g, '""')}"`;
    }).join(",");
  });

  // Combine headers and rows
  const csvContent = [headers.join(","), ...rows].join("\n");

  // Create a Blob and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
