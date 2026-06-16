package main

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
)

var cpuHistory []float64
var mu sync.Mutex

type StaticSystemInfo struct {
	Hostname      string `json:"hostname"`
	OS            string `json:"os"`
	Platform      string `json:"platform"`
	MemoryTotalGB uint64 `json:"memory_total_gb"`
	DiskTotalGB   uint64 `json:"disk_total_gb"`
}

type DynamicSystemInfo struct {
	Uptime       uint64    `json:"uptime_seconds"`
	CPUUsage     float64   `json:"cpu_usage_percent"`
	CPUHistory   []float64 `json:"cpu_history"`
	MemoryUsedGB uint64    `json:"memory_used_gb"`
	DiskUsedGB   uint64    `json:"disk_used_gb"`
}

func getStaticSystemInfo(c *gin.Context) {
	vmStat, _ := mem.VirtualMemory()

	diskStat, _ := disk.Usage("/")

	hostStat, _ := host.Info()

	info := StaticSystemInfo{
		Hostname:      hostStat.Hostname,
		OS:            hostStat.OS,
		Platform:      hostStat.Platform,
		MemoryTotalGB: vmStat.Total / (1024 * 1024 * 1024),
		DiskTotalGB:   diskStat.Total / (1024 * 1024 * 1024),
	}
	c.JSON(http.StatusOK, info)
}

func getDynamicSystemInfo(c *gin.Context) {
	cpuPercent, _ := cpu.Percent(time.Second, false)

	vmStat, _ := mem.VirtualMemory()

	diskStat, _ := disk.Usage("/")

	hostStat, _ := host.Info()

	mu.Lock()
	history := make([]float64, len(cpuHistory))
	copy(history, cpuHistory)
	mu.Unlock()

	info := DynamicSystemInfo{
		Uptime:       hostStat.Uptime,
		CPUUsage:     cpuPercent[0],
		CPUHistory:   history,
		MemoryUsedGB: vmStat.Used / (1024 * 1024 * 1024),
		DiskUsedGB:   diskStat.Used / (1024 * 1024 * 1024),
	}

	c.JSON(http.StatusOK, info)
}

func collectCPU() {
	for {
		cpuPercent, _ := cpu.Percent(0, false)
		mu.Lock()
		cpuHistory = append(cpuHistory, cpuPercent[0])
		if len(cpuHistory) > 10 {
			cpuHistory = cpuHistory[1:]
		}
		mu.Unlock()
		time.Sleep(time.Second)
	}
}

func main() {
	router := gin.Default()
	go collectCPU()
	router.GET("/static-system-info", getStaticSystemInfo)
	router.GET("/dynamic-system-info", getDynamicSystemInfo)
	router.Run(":8080")
}
