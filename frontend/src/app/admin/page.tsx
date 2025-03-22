"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Coupon {
  _id: string;
  code: string;
  isActive: boolean;
  isClaimed: boolean;
}

interface ClaimHistory {
  _id: string;
  couponCode: string;
  claimedByIP: string;
  claimedBySession: string;
  claimedAt: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [claimHistory, setClaimHistory] = useState<ClaimHistory[]>([]);
  const [newCoupon, setNewCoupon] = useState("");

  const checkAuth = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/admin/check-auth",
        {
          withCredentials: true,
        }
      );
      if (response.data.isAuthenticated) {
        setIsLoggedIn(true);
        fetchCoupons();
        fetchClaimHistory();
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginData.username || !loginData.password) {
      setLoginError("Please enter both username and password");
      return;
    }

    try {
      setIsLoading(true);
      await axios.post("http://localhost:3000/api/admin/login", loginData, {
        withCredentials: true,
      });

      setIsLoggedIn(true);
      fetchCoupons();
      fetchClaimHistory();
    } catch (error: any) {
      setLoginData((prev) => ({ ...prev, password: "" }));
      setLoginError("Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/admin/coupons",
        {
          withCredentials: true,
        }
      );
      setCoupons(response.data);
    } catch (error: any) {
      toast.error("Failed to fetch coupons");
    }
  };

  const fetchClaimHistory = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/admin/claim-history",
        {
          withCredentials: true,
        }
      );
      setClaimHistory(response.data);
    } catch (error: any) {
      toast.error("Failed to fetch claim history");
    }
  };

  const addCoupon = async () => {
    if (!newCoupon.trim()) return;

    try {
      await axios.post(
        "http://localhost:3000/api/admin/add-coupon",
        { code: newCoupon },
        { withCredentials: true }
      );
      setNewCoupon("");
      fetchCoupons();
      toast.success("Coupon added successfully");
    } catch (error: any) {
      toast.error("Failed to add coupon");
    }
  };

  const toggleCoupon = async (couponId: string) => {
    try {
      await axios.put(
        `http://localhost:3000/api/admin/toggle-coupon/${couponId}`,
        {},
        { withCredentials: true }
      );
      fetchCoupons();
      toast.success("Coupon status updated");
    } catch (error: any) {
      toast.error("Failed to update coupon status");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:3000/api/admin/logout",
        {},
        { withCredentials: true }
      );
      setIsLoggedIn(false);
      router.push("/");
    } catch (error) {
      toast.error("Error during logout");
    }
  };

  const handleBackToHome = async () => {
    try {
      await axios.get("http://localhost:3000/api/user/init", {
        withCredentials: true,
      });
      router.push("/");
    } catch (error) {
      router.push("/");
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-primary-300">Admin Login</h2>
            <button
              onClick={handleBackToHome}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Back to Home
            </button>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-md text-center">
                {loginError}
              </div>
            )}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                value={loginData.username}
                onChange={(e) =>
                  setLoginData({ ...loginData, username: e.target.value })
                }
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary-300">Admin Panel</h1>
        <div className="flex gap-4">
          <button
            onClick={handleBackToHome}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Home
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4 text-primary-200">
              Add New Coupon
            </h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={newCoupon}
                onChange={(e) => setNewCoupon(e.target.value)}
                placeholder="Enter coupon code"
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <button
                onClick={addCoupon}
                disabled={!newCoupon.trim()}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4 text-primary-200">
              Coupon List
            </h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {coupons.length === 0 ? (
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-300 text-center font-medium">
                    No coupons have been created yet
                  </p>
                </div>
              ) : coupons.filter((coupon) => !coupon.isClaimed).length === 0 ? (
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-300 text-center font-medium">
                    All coupons have been claimed
                  </p>
                </div>
              ) : (
                coupons
                  .filter((coupon) => !coupon.isClaimed)
                  .map((coupon) => (
                    <div
                      key={coupon._id}
                      className="flex justify-between items-center p-4 bg-gray-700 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-white">{coupon.code}</p>
                        <div className="flex gap-2 text-sm">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              coupon.isActive
                                ? "bg-green-900 text-green-200"
                                : "bg-red-900 text-red-200"
                            }`}
                          >
                            {coupon.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleCoupon(coupon._id)}
                        className={`px-3 py-1 rounded-lg transition-colors ${
                          coupon.isActive
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {coupon.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-4 text-primary-200">
            Claim History
          </h2>
          <div className="space-y-4 max-h-[700px] overflow-y-auto">
            {claimHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No claims yet</p>
            ) : (
              [...claimHistory]
                .sort(
                  (a, b) =>
                    new Date(b.claimedAt).getTime() -
                    new Date(a.claimedAt).getTime()
                )
                .map((claim) => (
                  <div
                    key={claim._id}
                    className="p-4 bg-gray-700 rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-white">
                        {claim.couponCode}
                      </p>
                      <span className="text-sm text-gray-400">
                        {new Date(claim.claimedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      <p>IP: {claim.claimedByIP}</p>
                      <p className="truncate">
                        Session: {claim.claimedBySession}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
