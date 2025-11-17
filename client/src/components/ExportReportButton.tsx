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

interface TaskReportStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  overdueTasks: number;
  completionRate: number;
  avgCompletionDays: number;
  tasksByStatus: {
    status: string;
    count: number;
  }[];
  tasksByPriority: {
    priority: string;
    count: number;
  }[];
  tasksByDepartment: {
    departmentId: string;
    departmentName: string;
    count: number;
  }[];
  timelineData: {
    date: string;
    completed: number;
    created: number;
  }[];
}

interface ExportReportButtonProps {
  stats: TaskReportStats | undefined;
  filters: {
    timeRange: string;
    year: string;
    month?: string;
    quarter?: string;
    week?: string;
    department: string;
    departmentName?: string;
    status: string;
  };
}

export default function ExportReportButton({ stats, filters }: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const getReportTitle = () => {
    const parts: string[] = ["Báo cáo Nhiệm vụ"];
    
    if (filters.department !== "all" && filters.departmentName) {
      parts.push(filters.departmentName);
    }
    
    if (filters.timeRange === "week" && filters.week) {
      parts.push(`Tuần ${filters.week}-${filters.year}`);
    } else if (filters.timeRange === "month" && filters.month) {
      const monthNames = ["", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", 
                         "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", 
                         "Tháng 11", "Tháng 12"];
      parts.push(`${monthNames[parseInt(filters.month)]}-${filters.year}`);
    } else if (filters.timeRange === "quarter" && filters.quarter) {
      parts.push(`Quý ${filters.quarter}-${filters.year}`);
    } else if (filters.timeRange === "year") {
      parts.push(`Năm ${filters.year}`);
    }
    
    return parts.join(" - ");
  };

  const getFileName = () => {
    const parts: string[] = ["bao-cao-nhiem-vu"];
    
    if (filters.timeRange === "week" && filters.week) {
      parts.push(`tuan${filters.week}-${filters.year}`);
    } else if (filters.timeRange === "month" && filters.month) {
      parts.push(`${filters.month}-${filters.year}`);
    } else if (filters.timeRange === "quarter" && filters.quarter) {
      parts.push(`q${filters.quarter}-${filters.year}`);
    } else if (filters.timeRange === "year") {
      parts.push(filters.year);
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
        ["BÁO CÁO NHIỆM VỤ"],
        ["Trung tâm Phục vụ Hành chính công tỉnh Bắc Ninh"],
        [""],
        ["Kỳ báo cáo:", getReportTitle()],
        ["Ngày xuất:", new Date().toLocaleDateString("vi-VN")],
        [""],
        ["CHỈ TIÊU", "GIÁ TRỊ"],
        ["Tổng Nhiệm Vụ", stats.totalTasks],
        ["Đã Hoàn Thành", stats.completedTasks],
        ["Đang Thực Hiện", stats.inProgressTasks],
        ["Chưa Bắt Đầu", stats.notStartedTasks],
        ["Quá Hạn", stats.overdueTasks],
        ["Tỷ Lệ Hoàn Thành (%)", stats.completionRate.toFixed(1)],
        ["Thời gian hoàn thành TB (ngày)", stats.avgCompletionDays.toFixed(1)],
      ];
      
      const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
      ws1["!cols"] = [{ width: 30 }, { width: 15 }];
      ws1["A1"]!.s = { font: { bold: true, sz: 14 }, alignment: { horizontal: "center" } };
      XLSX.utils.sheet_add_aoa(ws1, [[""]], { origin: -1 });
      XLSX.utils.book_append_sheet(wb, ws1, "Tổng quan");
      
      // Sheet 2: Theo trạng thái
      if (stats.tasksByStatus.length > 0) {
        const statusData = [
          ["PHÂN BỐ THEO TRẠNG THÁI"],
          [""],
          ["Trạng thái", "Số lượng"],
          ...stats.tasksByStatus.map(s => [s.status, s.count]),
        ];
        
        const ws2 = XLSX.utils.aoa_to_sheet(statusData);
        ws2["!cols"] = [{ width: 25 }, { width: 15 }];
        XLSX.utils.book_append_sheet(wb, ws2, "Theo trạng thái");
      }
      
      // Sheet 3: Theo độ ưu tiên
      if (stats.tasksByPriority.length > 0) {
        const priorityData = [
          ["PHÂN BỐ THEO ĐỘ ƯU TIÊN"],
          [""],
          ["Độ ưu tiên", "Số lượng"],
          ...stats.tasksByPriority.map(p => [p.priority, p.count]),
        ];
        
        const ws3 = XLSX.utils.aoa_to_sheet(priorityData);
        ws3["!cols"] = [{ width: 25 }, { width: 15 }];
        XLSX.utils.book_append_sheet(wb, ws3, "Theo độ ưu tiên");
      }
      
      // Sheet 4: Theo phòng ban
      if (stats.tasksByDepartment.length > 0) {
        const deptData = [
          ["PHÂN BỐ THEO PHÒNG BAN"],
          [""],
          ["Phòng ban", "Số lượng"],
          ...stats.tasksByDepartment.map(d => [d.departmentName, d.count]),
        ];
        
        const ws4 = XLSX.utils.aoa_to_sheet(deptData);
        ws4["!cols"] = [{ width: 30 }, { width: 15 }];
        XLSX.utils.book_append_sheet(wb, ws4, "Theo phòng ban");
      }
      
      // Sheet 5: Xu hướng thời gian
      if (stats.timelineData.length > 0) {
        const timelineData = [
          ["XU HƯỚNG THEO THỜI GIAN"],
          [""],
          ["Ngày", "Tạo mới", "Hoàn thành"],
          ...stats.timelineData.map(t => [
            new Date(t.date).toLocaleDateString("vi-VN"),
            t.created,
            t.completed,
          ]),
        ];
        
        const ws5 = XLSX.utils.aoa_to_sheet(timelineData);
        ws5["!cols"] = [{ width: 15 }, { width: 12 }, { width: 12 }];
        XLSX.utils.book_append_sheet(wb, ws5, "Xu hướng");
      }
      
      XLSX.writeFile(wb, `${getFileName()}.xlsx`);
    } catch (error) {
      console.error("Export error:", error);
      alert("Có lỗi khi xuất báo cáo");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = () => {
    if (!stats) {
      alert("Không có dữ liệu để xuất báo cáo");
      return;
    }
    
    setIsExporting(true);
    
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Vui lòng cho phép popup để in báo cáo");
        setIsExporting(false);
        return;
      }
      
      const doc = printWindow.document;
      doc.open();
      
      const html = doc.createElement("html");
      const head = doc.createElement("head");
      const title = doc.createElement("title");
      title.textContent = getReportTitle();
      
      const style = doc.createElement("style");
      style.textContent = `
        @media print {
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
          .page-break { page-break-after: always; }
        }
        body { margin: 20px; font-family: Arial, sans-serif; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 10px 0; font-size: 20px; }
        .header p { margin: 5px 0; color: #666; }
        .section { margin-bottom: 30px; }
        .section h2 { font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #1976D2; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #1976D2; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
        .stat-card { padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .stat-label { font-weight: bold; color: #666; font-size: 14px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1976D2; margin-top: 5px; }
      `;
      
      head.appendChild(title);
      head.appendChild(style);
      
      const body = doc.createElement("body");
      
      const header = doc.createElement("div");
      header.className = "header";
      const h1 = doc.createElement("h1");
      h1.textContent = "BÁO CÁO NHIỆM VỤ";
      const org = doc.createElement("p");
      org.textContent = "Trung tâm Phục vụ Hành chính công tỉnh Bắc Ninh";
      const period = doc.createElement("p");
      period.textContent = getReportTitle();
      const date = doc.createElement("p");
      date.textContent = `Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`;
      
      header.appendChild(h1);
      header.appendChild(org);
      header.appendChild(period);
      header.appendChild(date);
      body.appendChild(header);
      
      const section1 = doc.createElement("div");
      section1.className = "section";
      const h2_1 = doc.createElement("h2");
      h2_1.textContent = "1. Tổng quan";
      section1.appendChild(h2_1);
      
      const statsGrid = doc.createElement("div");
      statsGrid.className = "stats-grid";
      
      const statCards = [
        { label: "Tổng Nhiệm Vụ", value: stats.totalTasks },
        { label: "Đã Hoàn Thành", value: stats.completedTasks },
        { label: "Đang Thực Hiện", value: stats.inProgressTasks },
        { label: "Chưa Bắt Đầu", value: stats.notStartedTasks },
        { label: "Quá Hạn", value: stats.overdueTasks },
        { label: "Tỷ Lệ Hoàn Thành", value: `${stats.completionRate.toFixed(1)}%` },
      ];
      
      statCards.forEach(stat => {
        const card = doc.createElement("div");
        card.className = "stat-card";
        const label = doc.createElement("div");
        label.className = "stat-label";
        label.textContent = stat.label;
        const value = doc.createElement("div");
        value.className = "stat-value";
        value.textContent = String(stat.value);
        card.appendChild(label);
        card.appendChild(value);
        statsGrid.appendChild(card);
      });
      
      section1.appendChild(statsGrid);
      body.appendChild(section1);
      
      if (stats.tasksByStatus.length > 0) {
        const section2 = doc.createElement("div");
        section2.className = "section page-break";
        const h2_2 = doc.createElement("h2");
        h2_2.textContent = "2. Phân bố theo Trạng thái";
        section2.appendChild(h2_2);
        
        const table2 = doc.createElement("table");
        const thead2 = doc.createElement("thead");
        const trh2 = doc.createElement("tr");
        const th2_1 = doc.createElement("th");
        th2_1.textContent = "Trạng thái";
        const th2_2 = doc.createElement("th");
        th2_2.textContent = "Số lượng";
        trh2.appendChild(th2_1);
        trh2.appendChild(th2_2);
        thead2.appendChild(trh2);
        table2.appendChild(thead2);
        
        const tbody2 = doc.createElement("tbody");
        stats.tasksByStatus.forEach(s => {
          const tr = doc.createElement("tr");
          const td1 = doc.createElement("td");
          td1.textContent = s.status;
          const td2 = doc.createElement("td");
          td2.textContent = String(s.count);
          tr.appendChild(td1);
          tr.appendChild(td2);
          tbody2.appendChild(tr);
        });
        table2.appendChild(tbody2);
        section2.appendChild(table2);
        body.appendChild(section2);
      }
      
      if (stats.tasksByPriority.length > 0) {
        const section3 = doc.createElement("div");
        section3.className = "section";
        const h2_3 = doc.createElement("h2");
        h2_3.textContent = "3. Phân bố theo Độ ưu tiên";
        section3.appendChild(h2_3);
        
        const table3 = doc.createElement("table");
        const thead3 = doc.createElement("thead");
        const trh3 = doc.createElement("tr");
        const th3_1 = doc.createElement("th");
        th3_1.textContent = "Độ ưu tiên";
        const th3_2 = doc.createElement("th");
        th3_2.textContent = "Số lượng";
        trh3.appendChild(th3_1);
        trh3.appendChild(th3_2);
        thead3.appendChild(trh3);
        table3.appendChild(thead3);
        
        const tbody3 = doc.createElement("tbody");
        stats.tasksByPriority.forEach(p => {
          const tr = doc.createElement("tr");
          const td1 = doc.createElement("td");
          td1.textContent = p.priority;
          const td2 = doc.createElement("td");
          td2.textContent = String(p.count);
          tr.appendChild(td1);
          tr.appendChild(td2);
          tbody3.appendChild(tr);
        });
        table3.appendChild(tbody3);
        section3.appendChild(table3);
        body.appendChild(section3);
      }
      
      if (stats.tasksByDepartment.length > 0) {
        const section4 = doc.createElement("div");
        section4.className = "section page-break";
        const h2_4 = doc.createElement("h2");
        h2_4.textContent = "4. Phân bố theo Phòng ban";
        section4.appendChild(h2_4);
        
        const table4 = doc.createElement("table");
        const thead4 = doc.createElement("thead");
        const trh4 = doc.createElement("tr");
        const th4_1 = doc.createElement("th");
        th4_1.textContent = "Phòng ban";
        const th4_2 = doc.createElement("th");
        th4_2.textContent = "Số lượng";
        trh4.appendChild(th4_1);
        trh4.appendChild(th4_2);
        thead4.appendChild(trh4);
        table4.appendChild(thead4);
        
        const tbody4 = doc.createElement("tbody");
        stats.tasksByDepartment.forEach(d => {
          const tr = doc.createElement("tr");
          const td1 = doc.createElement("td");
          td1.textContent = d.departmentName;
          const td2 = doc.createElement("td");
          td2.textContent = String(d.count);
          tr.appendChild(td1);
          tr.appendChild(td2);
          tbody4.appendChild(tr);
        });
        table4.appendChild(tbody4);
        section4.appendChild(table4);
        body.appendChild(section4);
      }
      
      html.appendChild(head);
      html.appendChild(body);
      doc.appendChild(html);
      doc.close();
      
      setTimeout(() => {
        printWindow.print();
        setIsExporting(false);
      }, 250);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("Có lỗi khi xuất PDF");
      setIsExporting(false);
    }
  };

  if (!stats || stats.totalTasks === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isExporting} data-testid="button-export-report">
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Đang xuất..." : "Xuất báo cáo"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel} data-testid="menu-export-excel">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Xuất Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} data-testid="menu-export-pdf">
          <Printer className="h-4 w-4 mr-2" />
          Xuất PDF (In)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
