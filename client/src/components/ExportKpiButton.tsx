import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import * as XLSX from "xlsx";

interface KpiStats {
  overallStats: {
    avgKpi: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalDepartments: number;
    totalUsers: number;
  };
  kpiByDepartment: {
    departmentId: string;
    departmentName: string;
    departmentCode: string;
    avgKpi: number;
    userCount: number;
  }[];
  topPerformers: {
    userId: string;
    fullName: string;
    departmentName: string | null;
    kpi: number;
    taskCount: number;
  }[];
  monthlyTrend: {
    month: string;
    avgKpi: number;
  }[];
}

interface ExportKpiButtonProps {
  stats: KpiStats | undefined;
  filters: {
    year: string;
    month: string;
    department: string;
    departmentName?: string;
  };
}

export default function ExportKpiButton({ stats, filters }: ExportKpiButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const getReportTitle = () => {
    const parts: string[] = ["Báo cáo KPI"];
    
    if (filters.department !== "all" && filters.departmentName) {
      parts.push(filters.departmentName);
    }
    
    if (filters.year !== "all") {
      if (filters.month !== "all") {
        const monthNames = ["", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", 
                           "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", 
                           "Tháng 11", "Tháng 12"];
        parts.push(`${monthNames[parseInt(filters.month)]}-${filters.year}`);
      } else {
        parts.push(`Năm ${filters.year}`);
      }
    } else {
      parts.push("Toàn bộ");
    }
    
    return parts.join(" - ");
  };

  const getFileName = () => {
    const parts: string[] = ["bao-cao-kpi"];
    
    if (filters.year !== "all") {
      if (filters.month !== "all") {
        parts.push(`${filters.month}-${filters.year}`);
      } else {
        parts.push(filters.year);
      }
    } else {
      parts.push("toan-bo");
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    parts.push(timestamp);
    
    return parts.join("-");
  };

  const exportToExcel = () => {
    if (!stats) {
      alert("Không có dữ liệu để xuất báo cáo");
      return;
    }
    
    setIsExporting(true);
    
    try {
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Tổng quan
      const overviewData = [
        ["BÁO CÁO THỐNG KÊ KPI"],
        ["Trung tâm Phục vụ Hành chính công tỉnh Bắc Ninh"],
        [""],
        ["Kỳ báo cáo:", getReportTitle()],
        ["Ngày xuất:", new Date().toLocaleDateString("vi-VN")],
        [""],
        ["CHỈ TIÊU", "GIÁ TRỊ"],
        ["KPI Trung Bình", stats.overallStats.avgKpi.toFixed(1)],
        ["Tổng Nhiệm Vụ", stats.overallStats.totalTasks],
        ["Đã Hoàn Thành", stats.overallStats.completedTasks],
        ["Tỷ Lệ Hoàn Thành (%)", stats.overallStats.completionRate.toFixed(1)],
        ["Số Phòng Ban", stats.overallStats.totalDepartments],
        ["Số Cán Bộ", stats.overallStats.totalUsers],
      ];
      
      const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
      
      // Merge cells for title
      ws1['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      ];
      
      // Set column widths
      ws1['!cols'] = [{ wch: 30 }, { wch: 20 }];
      
      XLSX.utils.book_append_sheet(wb, ws1, "Tổng quan");
      
      // Sheet 2: Top 10 cá nhân
      const topPerformersData = [
        ["TOP 10 CÁ NHÂN XUẤT SẮC"],
        [""],
        ["STT", "Họ và Tên", "Phòng Ban", "KPI", "Số Nhiệm Vụ"],
      ];
      
      stats.topPerformers.forEach((performer, index) => {
        topPerformersData.push([
          (index + 1).toString(),
          performer.fullName,
          performer.departmentName || "N/A",
          performer.kpi.toFixed(1),
          performer.taskCount.toString(),
        ]);
      });
      
      const ws2 = XLSX.utils.aoa_to_sheet(topPerformersData);
      ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
      ws2['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 15 }];
      
      XLSX.utils.book_append_sheet(wb, ws2, "Top 10");
      
      // Sheet 3: Theo phòng ban
      const departmentData = [
        ["KPI THEO PHÒNG BAN"],
        [""],
        ["Mã PB", "Tên Phòng Ban", "KPI TB", "Số Cán Bộ"],
      ];
      
      stats.kpiByDepartment.forEach((dept) => {
        departmentData.push([
          dept.departmentCode,
          dept.departmentName,
          dept.avgKpi.toFixed(1),
          dept.userCount.toString(),
        ]);
      });
      
      const ws3 = XLSX.utils.aoa_to_sheet(departmentData);
      ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
      ws3['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 15 }];
      
      XLSX.utils.book_append_sheet(wb, ws3, "Theo phòng ban");
      
      // Sheet 4: Xu hướng theo tháng
      if (stats.monthlyTrend.length > 0) {
        const trendData = [
          ["XU HƯỚNG KPI THEO THÁNG"],
          [""],
          ["Tháng", "KPI Trung Bình"],
        ];
        
        stats.monthlyTrend.forEach((trend) => {
          trendData.push([
            trend.month,
            trend.avgKpi.toFixed(1),
          ]);
        });
        
        const ws4 = XLSX.utils.aoa_to_sheet(trendData);
        ws4['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
        ws4['!cols'] = [{ wch: 20 }, { wch: 20 }];
        
        XLSX.utils.book_append_sheet(wb, ws4, "Xu hướng tháng");
      }
      
      // Write file
      XLSX.writeFile(wb, `${getFileName()}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Có lỗi xảy ra khi xuất báo cáo Excel");
    } finally {
      setIsExporting(false);
    }
  };

  // Helper function to safely create text node
  const createTextNode = (text: string): Text => {
    return document.createTextNode(text);
  };

  // Helper function to safely create element with text content
  const createElement = (tag: string, textContent?: string, styles?: Partial<CSSStyleDeclaration>): HTMLElement => {
    const el = document.createElement(tag);
    if (textContent) el.textContent = textContent;
    if (styles) Object.assign(el.style, styles);
    return el;
  };

  const exportToPdf = () => {
    if (!stats) {
      alert("Không có dữ liệu để xuất báo cáo");
      return;
    }
    
    setIsExporting(true);
    
    // Create print window
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Không thể mở cửa sổ in. Vui lòng kiểm tra trình duyệt cho phép popup.");
      setIsExporting(false);
      return;
    }
    
    // Create document structure safely using DOM methods
    const doc = printWindow.document;
    
    // Add styles
    const style = doc.createElement("style");
    style.textContent = `
      @media print {
        @page { margin: 20mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page-break { page-break-after: always; }
      }
      body { font-family: Arial, sans-serif; padding: 20mm; }
      table { border-collapse: collapse; width: 100%; margin: 20px 0; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #1976D2; color: white; }
      h1 { color: #1976D2; margin: 10px 0; }
      h2 { color: #333; margin-top: 30px; }
      h3 { margin: 5px 0; }
      .text-center { text-align: center; }
      .mb-30 { margin-bottom: 30px; }
    `;
    doc.head.appendChild(style);
    
    // Header section
    const header = createElement("div");
    header.className = "text-center mb-30";
    
    const h1 = createElement("h1", "BÁO CÁO THỐNG KÊ KPI");
    const h3 = createElement("h3", "Trung tâm Phục vụ Hành chính công tỉnh Bắc Ninh");
    
    const pPeriod = createElement("p");
    pPeriod.appendChild(createElement("strong", "Kỳ báo cáo: "));
    pPeriod.appendChild(createTextNode(getReportTitle()));
    
    const pDate = createElement("p");
    pDate.appendChild(createElement("strong", "Ngày xuất: "));
    pDate.appendChild(createTextNode(new Date().toLocaleDateString("vi-VN")));
    
    header.appendChild(h1);
    header.appendChild(h3);
    header.appendChild(pPeriod);
    header.appendChild(pDate);
    doc.body.appendChild(header);
    
    // Section I: Tổng quan
    doc.body.appendChild(createElement("h2", "I. Tổng quan"));
    
    const table1 = doc.createElement("table");
    const headerRow1 = doc.createElement("tr");
    headerRow1.appendChild(createElement("th", "Chỉ tiêu"));
    headerRow1.appendChild(createElement("th", "Giá trị"));
    table1.appendChild(headerRow1);
    
    const overviewData = [
      ["KPI Trung Bình", stats.overallStats.avgKpi.toFixed(1)],
      ["Tổng Nhiệm Vụ", stats.overallStats.totalTasks.toString()],
      ["Đã Hoàn Thành", stats.overallStats.completedTasks.toString()],
      ["Tỷ Lệ Hoàn Thành", `${stats.overallStats.completionRate.toFixed(1)}%`],
      ["Số Phòng Ban", stats.overallStats.totalDepartments.toString()],
      ["Số Cán Bộ", stats.overallStats.totalUsers.toString()],
    ];
    
    overviewData.forEach(([label, value]) => {
      const row = doc.createElement("tr");
      row.appendChild(createElement("td", label));
      const valueCell = createElement("td");
      if (label === "KPI Trung Bình") {
        valueCell.appendChild(createElement("strong", value));
      } else {
        valueCell.textContent = value;
      }
      row.appendChild(valueCell);
      table1.appendChild(row);
    });
    
    doc.body.appendChild(table1);
    
    // Section II: Top 10
    doc.body.appendChild(createElement("h2", "II. Top 10 Cá nhân Xuất sắc"));
    
    const table2 = doc.createElement("table");
    const headerRow2 = doc.createElement("tr");
    ["STT", "Họ và Tên", "Phòng Ban", "KPI", "Số Nhiệm Vụ"].forEach(header => {
      headerRow2.appendChild(createElement("th", header));
    });
    table2.appendChild(headerRow2);
    
    stats.topPerformers.forEach((p, i) => {
      const row = doc.createElement("tr");
      row.appendChild(createElement("td", (i + 1).toString()));
      row.appendChild(createElement("td", p.fullName));
      row.appendChild(createElement("td", p.departmentName || "N/A"));
      const kpiCell = createElement("td");
      kpiCell.appendChild(createElement("strong", p.kpi.toFixed(1)));
      row.appendChild(kpiCell);
      row.appendChild(createElement("td", p.taskCount.toString()));
      table2.appendChild(row);
    });
    
    doc.body.appendChild(table2);
    
    // Page break
    const pageBreak = createElement("div");
    pageBreak.className = "page-break";
    doc.body.appendChild(pageBreak);
    
    // Section III: KPI theo phòng ban
    doc.body.appendChild(createElement("h2", "III. KPI theo Phòng Ban"));
    
    const table3 = doc.createElement("table");
    const headerRow3 = doc.createElement("tr");
    ["Mã PB", "Tên Phòng Ban", "KPI TB", "Số Cán Bộ"].forEach(header => {
      headerRow3.appendChild(createElement("th", header));
    });
    table3.appendChild(headerRow3);
    
    stats.kpiByDepartment.forEach(d => {
      const row = doc.createElement("tr");
      row.appendChild(createElement("td", d.departmentCode));
      row.appendChild(createElement("td", d.departmentName));
      const kpiCell = createElement("td");
      kpiCell.appendChild(createElement("strong", d.avgKpi.toFixed(1)));
      row.appendChild(kpiCell);
      row.appendChild(createElement("td", d.userCount.toString()));
      table3.appendChild(row);
    });
    
    doc.body.appendChild(table3);
    
    // Section IV: Xu hướng theo tháng (if data available)
    if (stats.monthlyTrend.length > 0) {
      // Page break before next section
      const pageBreak2 = createElement("div");
      pageBreak2.className = "page-break";
      doc.body.appendChild(pageBreak2);
      
      doc.body.appendChild(createElement("h2", "IV. Xu hướng KPI theo tháng"));
      
      const table4 = doc.createElement("table");
      const headerRow4 = doc.createElement("tr");
      ["Tháng", "KPI Trung Bình"].forEach(header => {
        headerRow4.appendChild(createElement("th", header));
      });
      table4.appendChild(headerRow4);
      
      stats.monthlyTrend.forEach(trend => {
        const row = doc.createElement("tr");
        row.appendChild(createElement("td", trend.month));
        const kpiCell = createElement("td");
        kpiCell.appendChild(createElement("strong", trend.avgKpi.toFixed(1)));
        row.appendChild(kpiCell);
        table4.appendChild(row);
      });
      
      doc.body.appendChild(table4);
    }
    
    // Close document and trigger print
    doc.close();
    
    setTimeout(() => {
      printWindow.print();
      setIsExporting(false);
    }, 500);
  };

  if (!stats) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="default"
          disabled={isExporting}
          data-testid="button-export-kpi"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Đang xuất..." : "Xuất báo cáo"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel} data-testid="menu-export-excel">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Xuất Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPdf} data-testid="menu-export-pdf">
          <Printer className="h-4 w-4 mr-2" />
          In PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
