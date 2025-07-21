import { create } from "zustand"

interface ScheduleData {
  groupId: string
  count: number
}

interface StoreState {
  tokenAddress: string
  network: string
  timestamp: number

  price: number | null
  priceSource: string | null
  isLoadingPrice: boolean

  scheduleData: ScheduleData | null
  isLoadingSchedule: boolean

  jobProgress: number
  isLoadingProgress: boolean

  error: string | null

  setTokenAddress: (address: string) => void
  setNetwork: (network: string) => void
  setTimestamp: (timestamp: number) => void
  fetchPrice: () => Promise<void>
  scheduleJob: () => Promise<ScheduleData | null>
  fetchJobProgress: (groupId: string) => Promise<number>
  clearError: () => void
}

export const useStore = create<StoreState>((set, get) => ({
  tokenAddress: "",
  network: "",
  timestamp: 0,
  price: null,
  priceSource:"",
  isLoadingPrice: false,
  scheduleData: null,
  isLoadingSchedule: false,
  jobProgress: 0,
  isLoadingProgress: false,
  error: null,

  setTokenAddress: (address) => set({ tokenAddress: address, error: null }),
  setNetwork: (network) => set({ network, error: null }),
  setTimestamp: (timestamp) => set({ timestamp, error: null }),

  clearError: () => set({ error: null }),

  fetchPrice: async () => {
  const { tokenAddress, network, timestamp } = get()
  set({ isLoadingPrice: true, error: null })

  try {
    const query = new URLSearchParams({
      token: tokenAddress,
      network,
      timestamp: timestamp.toString(),
    }).toString()

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/price?${query}`)

    if (!response.ok) throw new Error("Failed to fetch price")

    const data = await response.json()
    set({
      price: data.price,
      priceSource: data.source || null,
      isLoadingPrice: false,
    })
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : "Failed to fetch price",
      isLoadingPrice: false,
      price: null,
      priceSource: null,
    })
  }
},


  scheduleJob: async () => {
    const { tokenAddress, network } = get()
    set({ isLoadingSchedule: true, error: null, jobProgress: 0 })

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenAddress, // ✅ Fix here
          network,
        }),
      })

      if (!response.ok) throw new Error("Failed to schedule job")

      const data = await response.json()
      set({
        scheduleData: data,
        isLoadingSchedule: false,
        jobProgress: 0,
      })

      return data
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to schedule job",
        isLoadingSchedule: false,
      })
      return null
    }
  },

  fetchJobProgress: async (groupId: string) => {
    set({ isLoadingProgress: true })

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/${groupId}`)

      if (!response.ok) throw new Error("Failed to fetch job progress")

      const data = await response.json()
      console.log("Job progress data:", data)
      set({ jobProgress: data.percent, isLoadingProgress: false })

      return data.percent
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch progress",
        isLoadingProgress: false,
      })
      return 0
    }
  },
}))
