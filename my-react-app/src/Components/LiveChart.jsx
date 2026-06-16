import { LineChart } from "@mui/x-charts";
import { useState, useEffect } from "react";
import "../App.css";

function LiveChart() {
  const MAX_POINTS = 10;
  const [staticSystemInfo, setStaticSystemInfo] = useState(null);
  const [dynamicSystemInfo, setDynamicSystemInfo] = useState(null);
  const [data, setData] = useState(Array(MAX_POINTS).fill(0));
  const [buffer, setBuffer] = useState([]);
  const [index, setIndex] = useState(0);

  
  useEffect(()=>{
    const fetchStaticInfo = async()=>{
      const res = await fetch("/api/static-system-info");
      const result = await res.json();
      setStaticSystemInfo(result);
    };
    fetchStaticInfo();
  }, []);


  useEffect(() => {
  const fetchData = async () => {
    const res = await fetch("/api/dynamic-system-info");
    const result = await res.json();
    setDynamicSystemInfo(result);
    setBuffer(result.cpu_history || []);
    setIndex(0);
    };
    fetchData();
    const interval = setInterval(fetchData, 10*900);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
  if (!buffer.length) return;

  const timer = setInterval(() => {
    setIndex((prev) => {
      if (prev >= buffer.length) {
        return prev;
      }

      setData((currentData) => [
        ...currentData.slice(1),
        buffer[prev],
      ]);

      return prev + 1;
      });
    }, 1200);

    return () => clearInterval(timer);
  }, [buffer]);


  const current = data[data.length - 1].toFixed(1);
  const average = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1);
  const max = Math.max(...data).toFixed(1);


  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "10px auto",
        padding: "20px",
        borderRadius: "16px",
        background: "#61e0e7",
      }}
    >
      <h2>
        CPU Performance Monitor
      </h2>

      <p>
        <h3>HostName: {staticSystemInfo?.hostname}</h3>
        <h3>OS: {staticSystemInfo?.os}</h3>
        <h3>Platform: {staticSystemInfo?.platform}</h3>
        <h3>Total memory: {staticSystemInfo?.memory_total_gb}</h3>
        <h3>Total disk: {staticSystemInfo?.disk_total_gb}</h3>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <div className="card">
          <h4>Current</h4>
          <h2>{current}%</h2>
        </div>

        <div className="card">
          <h4>Average</h4>
          <h2>{average}%</h2>
        </div>

        <div className="card">
          <h4>Maximum</h4>
          <h2>{max}%</h2>
        </div>
        
        <div className="card">
          <h4>Uptime </h4>
          <h2>{dynamicSystemInfo?.uptime_seconds}</h2>
        </div>

        <div className="card">
          <h4>Memory used</h4>
          <h2>{dynamicSystemInfo?.memory_used_gb}</h2>
        </div>

        <div className="card">
          <h4>Disk used</h4>
          <h2>{dynamicSystemInfo?.disk_used_gb}</h2>
        </div>
      </div>

      <LineChart
        height={350}
        xAxis={[
          {
            scaleType: "point",
            data: Array.from(
              { length: MAX_POINTS },
              (_, i) => `${MAX_POINTS - i}s`
            ),
          },
        ]}
        yAxis={[
          {
            min: 0,
            max: 100,
          },
        ]}
        series={[
          {
            data,
            label: "CPU Usage %",
            showMark: false,
            area: true,
            curve: "monotoneX",
          },
        ]}
        grid={{ horizontal: true, vertical: true }}
      />
    </div>
  );
}

export default LiveChart;