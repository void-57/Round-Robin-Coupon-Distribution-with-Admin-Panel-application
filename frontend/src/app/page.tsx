"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Link from "next/link";

interface ClaimStatus {
  claimed: boolean;
  couponCode?: string;
  message?: string;
  claimedAt?: string;
  timeRemaining?: number;
  nextClaimTime?: string;
  ipCooldownTime?: string;
  cookieCooldownTime?: string;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>({
    claimed: false,
  });
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [ipTimeRemaining, setIpTimeRemaining] = useState<string>("");
  const [canClaim, setCanClaim] = useState(false);
  const [error, setError] = useState<string>("");

  const formatTimeRemaining = (milliseconds: number) => {
    if (milliseconds <= 0) return "0:00";
    const minutes = Math.floor(milliseconds / (60 * 1000));
    const seconds = Math.floor((milliseconds % (60 * 1000)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const updateCountdown = async () => {
    if (claimStatus.nextClaimTime || claimStatus.ipCooldownTime) {
      const now = Date.now();

      // Check cookie cooldown
      let cookieRemaining = 0;
      if (claimStatus.nextClaimTime) {
        const nextClaimTime = new Date(claimStatus.nextClaimTime).getTime();
        cookieRemaining = nextClaimTime - now;
      }

      // Check IP cooldown
      let ipRemaining = 0;
      if (claimStatus.ipCooldownTime) {
        const ipCooldownTime = new Date(claimStatus.ipCooldownTime).getTime();
        ipRemaining = ipCooldownTime - now;
      }

      const remaining = Math.max(cookieRemaining, ipRemaining);

      if (remaining <= 0) {
        setTimeRemaining("0:00");
        setIpTimeRemaining("0:00");
        setCanClaim(true);
        setClaimStatus((prev) => ({ ...prev, claimed: false }));

        try {
          await axios.get("http://localhost:3000/api/user/init", {
            withCredentials: true,
          });
          setSessionInitialized(true);
          await checkClaimStatus(true);
        } catch (error) {
          console.error("Failed to reinitialize session:", error);
          toast.error(
            "Failed to reinitialize session. Please refresh the page."
          );
        }
        return;
      }

      setTimeRemaining(formatTimeRemaining(cookieRemaining));
      setIpTimeRemaining(formatTimeRemaining(ipRemaining));
      setCanClaim(false);
    }
  };

  const checkTimeUntilNextClaim = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/user/time-until-next-claim",
        {
          withCredentials: true,
        }
      );

      if (!response.data.canClaim) {
        const nextClaimTime = response.data.nextClaimTime;
        const ipCooldownTime = response.data.ipCooldownTime;
        setClaimStatus((prev) => ({
          ...prev,
          nextClaimTime,
          ipCooldownTime,
          claimed: true,
          couponCode: prev.couponCode,
          claimedAt: prev.claimedAt,
          message: prev.message,
        }));

        const now = Date.now();
        const cookieRemaining = nextClaimTime
          ? new Date(nextClaimTime).getTime() - now
          : 0;
        const ipRemaining = ipCooldownTime
          ? new Date(ipCooldownTime).getTime() - now
          : 0;

        setTimeRemaining(formatTimeRemaining(cookieRemaining));
        setIpTimeRemaining(formatTimeRemaining(ipRemaining));
        setCanClaim(false);
      } else {
        setCanClaim(true);
        setClaimStatus((prev) => ({
          ...prev,
          claimed: false,
          nextClaimTime: undefined,
          ipCooldownTime: undefined,
        }));
        setTimeRemaining("");
        setIpTimeRemaining("");
      }
    } catch (error) {
      console.error("Error checking time until next claim:", error);
    }
  };

  const checkClaimStatus = async (showToast = true) => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/user/claim-status",
        {
          withCredentials: true,
        }
      );

      if (response.data.claimed) {
        setClaimStatus({
          claimed: true,
          couponCode: response.data.coupon?.code,
          claimedAt: response.data.coupon?.claimedAt,
          message: response.data.message,
        });
        await checkTimeUntilNextClaim();
        if (showToast) {
          toast.success(`Your claimed coupon: ${response.data.coupon?.code}`);
        }
      } else {
        setCanClaim(true);
        setClaimStatus((prev) => ({ ...prev, claimed: false }));
        if (showToast) {
          toast("You can claim a new coupon!", {
            icon: "🎉",
          });
        }
      }
    } catch (error: any) {
      console.error("Error checking claim status:", error);
      if (showToast) {
        toast.error("Failed to check claim status. Please refresh the page.");
      }
    }
  };

  useEffect(() => {
    const initSession = async () => {
      try {
        await axios.get("http://localhost:3000/api/user/init", {
          withCredentials: true,
        });
        setSessionInitialized(true);
        // Only hide toast on initial page load, not on navigation
        const isInitialLoad = !document.referrer;
        await checkClaimStatus(!isInitialLoad);
      } catch (error) {
        console.error("Failed to initialize session:", error);
        toast.error("Failed to initialize session. Please try again.");
      }
    };
    initSession();
  }, []);

 
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      updateCountdown().catch((error) => {
        console.error("Error in countdown update:", error);
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [claimStatus.nextClaimTime, claimStatus.ipCooldownTime]);

  const claimCoupon = async () => {
    if (!sessionInitialized) {
      toast.error("Please wait for session initialization");
      return;
    }

    if (!canClaim) {
      toast.error("Please wait for the countdown to end before claiming again");
      return;
    }

    try {
      setLoading(true);
      setError(""); // Clear any previous errors
      const response = await axios.post(
        "http://localhost:3000/api/user/claim-coupon",
        {},
        {
          withCredentials: true,
        }
      );

      setClaimStatus({
        claimed: true,
        couponCode: response.data.coupon.code,
        claimedAt: response.data.coupon.claimedAt,
        message: response.data.message,
      });

      toast.success(
        `Successfully claimed coupon: ${response.data.coupon.code}`
      );
      await checkTimeUntilNextClaim();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to claim coupon";
      setError(errorMessage);
      if (error.response?.status === 404) {
        setError("No coupons available");
        setCanClaim(false);
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderClaimContent = () => {
    if (claimStatus.claimed || !canClaim) {
      return (
        <div className="space-y-4">
          {claimStatus.couponCode && (
            <div className="bg-gray-700 p-6 rounded-lg text-center">
              <h3 className="text-lg font-medium text-primary-300 mb-2">
                Your Coupon Code
              </h3>
              <div className="bg-gray-800 py-3 px-4 rounded-md">
                <code className="text-xl font-mono text-primary-200">
                  {claimStatus.couponCode}
                </code>
              </div>
              {claimStatus.claimedAt && (
                <p className="text-sm text-gray-400 mt-2">
                  Claimed at: {new Date(claimStatus.claimedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
          <div className="space-y-4">
            {claimStatus.nextClaimTime && (
              <div className="bg-blue-900/30 border border-blue-800 p-4 rounded-lg text-center">
                <p className="text-sm text-blue-200 mb-2">
                  Cookie cooldown remaining:
                </p>
                <div className="text-3xl font-mono font-medium text-blue-100">
                  {timeRemaining}
                </div>
              </div>
            )}
            {claimStatus.ipCooldownTime && (
              <div className="bg-purple-900/30 border border-purple-800 p-4 rounded-lg text-center">
                <p className="text-sm text-purple-200 mb-2">
                  IP cooldown remaining:
                </p>
                <div className="text-3xl font-mono font-medium text-purple-100">
                  {ipTimeRemaining}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <>
        {!sessionInitialized ? (
          <div className="text-center">
            <p className="text-gray-400">Initializing...</p>
          </div>
        ) : loading ? (
          <div className="text-center">
            <p className="text-gray-400">Claiming your coupon...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-md text-center mb-4">
                {error}
              </div>
            )}
            <p className="text-gray-300 mb-6 text-center">
              Click the button below to receive your unique coupon code.
            </p>
            <button
              onClick={claimCoupon}
              disabled={loading || !sessionInitialized || Boolean(error)}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Claim Coupon
            </button>
          </>
        )}
      </>
    );
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary-300">
          Coupon Distribution System
        </h1>
        <Link
          href="/admin"
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Admin Panel
        </Link>
      </div>

      <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-6 text-center text-primary-200">
          Claim Your Coupon
        </h2>
        {renderClaimContent()}
      </div>
    </main>
  );
}
