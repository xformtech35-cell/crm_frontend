import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Static data (replace with your real data later)
const defaultSalesData = [
  { name: "Mon", value: 120 },
  { name: "Tue", value: 200 },
  { name: "Wed", value: 150 },
  { name: "Thu", value: 278 },
  { name: "Fri", value: 189 },
  { name: "Sat", value: 239 },
  { name: "Sun", value: 349 },
];

const defaultPieData = [
  { name: "New Leads", value: 400 },
  { name: "Converted", value: 300 },
  { name: "Lost", value: 100 },
];

const COLORS = ["#6366F1", "#22C55E", "#EF4444"];

export default function AnalyticsDashboard() {
  const [salesData, setSalesData] = useState(defaultSalesData);
  const [pieData, setPieData] = useState(defaultPieData);
  const [stats, setStats] = useState({
    totalRevenue: "$48,320",
    activeLeads: "1,245",
    conversionRate: "32.4%",
  });

  // Export function - THIS IS THE FIXED VERSION
  const handleExportReport = () => {
    try {
      // Prepare the data for export
      const reportData = {
        generatedAt: new Date().toLocaleString(),
        summary: stats,
        weeklySales: salesData,
        leadDistribution: pieData,
      };

      // Create CSV content
      let csvRows = [];

      // Title and header
      csvRows.push(["CRM ANALYTICS REPORT"]);
      csvRows.push([`Generated: ${reportData.generatedAt}`]);
      csvRows.push([]);

      // Summary Section
      csvRows.push(["SUMMARY STATISTICS"]);
      csvRows.push(["Metric", "Value"]);
      csvRows.push(["Total Revenue", reportData.summary.totalRevenue]);
      csvRows.push(["Active Leads", reportData.summary.activeLeads]);
      csvRows.push(["Conversion Rate", reportData.summary.conversionRate]);
      csvRows.push([]);

      // Weekly Sales Section
      csvRows.push(["WEEKLY SALES"]);
      csvRows.push(["Day", "Revenue (USD)"]);
      reportData.weeklySales.forEach((day) => {
        csvRows.push([day.name, day.value]);
      });

      // Add weekly total
      const weeklyTotal = reportData.weeklySales.reduce(
        (sum, day) => sum + day.value,
        0,
      );
      csvRows.push(["TOTAL", weeklyTotal]);
      csvRows.push([]);

      // Lead Distribution Section
      csvRows.push(["LEAD DISTRIBUTION"]);
      csvRows.push(["Category", "Count"]);
      reportData.leadDistribution.forEach((category) => {
        csvRows.push([category.name, category.value]);
      });

      // Add lead total
      const leadTotal = reportData.leadDistribution.reduce(
        (sum, cat) => sum + cat.value,
        0,
      );
      csvRows.push(["TOTAL LEADS", leadTotal]);

      // Convert to CSV string
      const csvContent = csvRows.map((row) => row.join(",")).join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const today = new Date();
      const filename = `crm_report_${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Success message
      console.log("Report exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export report. Please try again.");
    }
  };

  return (
    
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics CRM</h1>
          <p className="text-gray-500 text-sm">
            Overview of your sales & leads performance
          </p>
        </div>
        <Button
          onClick={handleExportReport}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Export Report
        </Button>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <h2 className="text-2xl font-bold">{stats.totalRevenue}</h2>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Active Leads</p>
            <h2 className="text-2xl font-bold">{stats.activeLeads}</h2>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Conversion Rate</p>
            <h2 className="text-2xl font-bold">{stats.conversionRate}</h2>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Weekly Sales Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#6366F1"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Lead Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} leads`, "Count"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
