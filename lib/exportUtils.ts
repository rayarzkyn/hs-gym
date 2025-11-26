// lib/exportUtils.ts

export const generateExcel = (data: any[], filename: string) => {
  try {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating Excel:', error);
    alert('Terjadi kesalahan saat generate file Excel');
  }
};

export const generatePDF = (data: any[], filename: string, type: string) => {
  try {
    // In a real implementation, you would use a PDF library like jsPDF
    // For now, we'll create a simple text file as mock
    let content = `Laporan ${type}\n`;
    content += `Generated: ${new Date().toLocaleString('id-ID')}\n\n`;
    
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      content += headers.join('\t') + '\n';
      
      data.forEach(row => {
        const values = headers.map(header => String(row[header] || ''));
        content += values.join('\t') + '\n';
      });
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`PDF ${filename} berhasil di-generate (mock implementation)`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Terjadi kesalahan saat generate file PDF');
  }
};

const convertToCSV = (data: any[]) => {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle special characters and commas
        const stringValue = String(value || '');
        return `"${stringValue.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];
  
  return csvRows.join('\n');
};

// Utility function for date formatting
export const formatDateForExport = (date: Date) => {
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};