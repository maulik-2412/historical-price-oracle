"use client";

import { useState } from "react";
import { useStore } from "@/store/tokenStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Home() {
  const {
    tokenAddress,
    network,
    timestamp,
    price,
    isLoadingPrice,
    scheduleData,
    isLoadingSchedule,
    jobProgress,
    isLoadingProgress,
    error,
    setTokenAddress,
    setNetwork,
    setTimestamp,
    fetchPrice,
    scheduleJob,
    fetchJobProgress,
    priceSource,
  } = useStore();

  const [localTimestamp, setLocalTimestamp] = useState("");

  const handleGetPrice = async () => {
    if (!tokenAddress || !network || !timestamp) {
      return;
    }
    await fetchPrice();
  };

  const handleScheduleJob = async () => {
    if (!tokenAddress || !network) {
      return;
    }
    /* const result = */ await scheduleJob();
/*     if (result?.groupId) {
      // Start polling for progress
      const interval = setInterval(async () => {
        const progress = await fetchJobProgress(result.groupId);
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 2000);
    } */
  };

  const handleTimestampChange = (value: string) => {
    setLocalTimestamp(value);
    if (value) {
      const date = new Date(value);
      setTimestamp(Math.floor(date.getTime() / 1000));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Token Price & Scheduler
          </h1>
          <p className="text-gray-600">
            Get historical token prices and schedule blockchain jobs
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Token Configuration
            </CardTitle>
            <CardDescription>
              Enter token details to fetch price or schedule jobs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tokenAddress">Token Address</Label>
                <Input
                  id="tokenAddress"
                  placeholder="0x..."
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="network">Network</Label>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ethereum">Ethereum</SelectItem>
                    <SelectItem value="Polygon">Polygon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timestamp">Timestamp (for price lookup)</Label>
              <Input
                id="timestamp"
                type="datetime-local"
                value={localTimestamp}
                onChange={(e) => handleTimestampChange(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleGetPrice}
                disabled={
                  !tokenAddress || !network || !timestamp || isLoadingPrice
                }
                className="flex-1"
              >
                {isLoadingPrice ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching Price...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Get Price
                  </>
                )}
              </Button>

              <Button
                onClick={handleScheduleJob}
                disabled={!tokenAddress || !network || isLoadingSchedule}
                variant="outline"
                className="flex-1 bg-transparent"
              >
                {isLoadingSchedule ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Schedule Job
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {price && (
          <Card>
            <CardHeader>
              <CardTitle>Price Result</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${price.toFixed(6)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Price at {new Date(timestamp * 1000).toLocaleString()}
              </p>
              <CardDescription>
                Source:{" "}
                <span className="font-medium text-indigo-600">
                  {priceSource}
                </span>
              </CardDescription>
            </CardContent>
          </Card>
        )}

{/*         {scheduleData && (
          <Card>
            <CardHeader>
              <CardTitle>Job Schedule</CardTitle>
              <CardDescription>
                Group ID: {scheduleData.groupId} | Total Jobs:{" "}
                {scheduleData.count}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{jobProgress}%</span>
                </div>
                <Progress value={jobProgress} className="w-full" />
              </div>
              {isLoadingProgress && (
                <div className="flex items-center text-sm text-gray-500">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Updating progress...
                </div>
              )}
              {jobProgress === 100 && (
                <div className="text-sm text-green-600 font-medium">
                  ✓ All jobs completed successfully!
                </div>
              )}
            </CardContent>
          </Card>
        )} */}
      </div>
    </div>
  );
}
