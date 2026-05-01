import { useState, useEffect } from "react";
import AsyncSelect from "react-select/async";
import { API_BASE_URL } from "@/config/Api";
import { useUser } from "@/context/UserContext";
import { useNavigate } from "react-router-dom";

type OptionType = {
  value: string;
  label: string;
  otherValue: string;
};

export default function SelectCustomerPage() {
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);

  const { login, isAuthenticated, isStaffMember } = useUser();
  const navigate = useNavigate();

  // ✅ Handle navigation AFTER state updates
  useEffect(() => {
    if (isAuthenticated && !isStaffMember) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isStaffMember, navigate]);

  const loadOptions = async (inputValue: string): Promise<OptionType[]> => {
    if (!inputValue || inputValue.length < 3) return [];

    try {
      const response = await fetch(
        `${API_BASE_URL}/Account/GetUserBySearching?search=${inputValue}`
      );
      const data = await response.json();

      return data.map((item: any) => ({
        value: item.value,
        label: item.label,
        otherValue: item.otherValue,
      }));
    } catch (error) {
      console.error("Error loading options:", error);
      return [];
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://scx2.b-cdn.net/gfx/news/hires/2019/2-nature.jpg')",
        }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-xl px-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-1 text-center">
            Select Customer
          </h2>

          <p className="text-sm text-gray-500 mb-4 text-center">
            Search by Customer ID / Login / Name (minimum 3 characters)
          </p>

          <AsyncSelect<OptionType>
            cacheOptions
            defaultOptions={false}
            loadOptions={loadOptions}
            value={selectedOption}
            onChange={(option) => {
              setSelectedOption(option);

              if (option) {
                // ✅ IMPORTANT: switch role to Customer after selection
                login(option.value, option.otherValue, "Staff");
              }
            }}
            placeholder="Type to search customer..."
            classNamePrefix="react-select"
          />

          {selectedOption && (
            <div className="mt-4 text-center text-sm text-indigo-700">
              Selected: {selectedOption.label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}