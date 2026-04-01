import { exportToExcel, exportToPDF } from '../utils/exportHelpers';

export default function ExportButtons({ data, columns, fileName = 'export', title = 'Report' }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => exportToExcel(data, columns, fileName)}
        className="btn-secondary flex items-center gap-2 text-xs"
        title="Export to Excel"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        Excel
      </button>
      <button
        onClick={() => exportToPDF(data, columns, fileName, title)}
        className="btn-secondary flex items-center gap-2 text-xs"
        title="Export to PDF"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        PDF
      </button>
    </div>
  );
}
