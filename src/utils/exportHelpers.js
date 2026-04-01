import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export data to Excel (.xlsx) file.
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of { header, key } defining column mapping
 * @param {string} fileName - Output file name (without extension)
 */
export function exportToExcel(data, columns, fileName = 'export') {
  const worksheetData = data.map(row => {
    const obj = {};
    columns.forEach(col => {
      obj[col.header] = row[col.key] ?? '';
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);

  // Set column widths
  worksheet['!cols'] = columns.map(col => ({
    wch: Math.max(col.header.length, 15)
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Export data to PDF file.
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of { header, key } defining column mapping
 * @param {string} fileName - Output file name (without extension)
 * @param {string} title - Title shown at top of PDF
 */
export function exportToPDF(data, columns, fileName = 'export', title = 'Report') {
  const doc = new jsPDF({
    orientation: columns.length > 8 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Title
  doc.setFontSize(16);
  doc.setTextColor(22, 101, 52); // Primary green
  doc.text(title, 14, 20);

  // Subtitle with date
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, 14, 27);

  // Table
  const headers = columns.map(col => col.header);
  const body = data.map(row =>
    columns.map(col => {
      const val = row[col.key];
      return val !== null && val !== undefined ? String(val) : '';
    })
  );

  doc.autoTable({
    head: [headers],
    body: body,
    startY: 32,
    theme: 'grid',
    headStyles: {
      fillColor: [22, 101, 52],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    styles: {
      overflow: 'linebreak',
      cellWidth: 'auto'
    },
    margin: { left: 14, right: 14 }
  });

  doc.save(`${fileName}.pdf`);
}
