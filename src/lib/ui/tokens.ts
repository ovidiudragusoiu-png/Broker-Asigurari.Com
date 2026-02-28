/**
 * Design system tokens for consistent styling across all components.
 * Import and use: className={btn.primary}
 */

export const btn = {
  primary:
    "rounded-lg bg-[#2563EB] px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 hover:shadow-md disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200",
  secondary:
    "rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200",
  tertiary:
    "text-sm font-semibold text-[#2563EB] hover:text-blue-700 hover:underline transition-colors duration-200",
} as const;

export const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none transition-colors duration-200";

export const inputError =
  "w-full rounded-lg border border-red-400 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-colors duration-200";

export const inputDisabled =
  "w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500 cursor-not-allowed";

export const inputReadonly =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700";

export const spinner =
  "h-5 w-5 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent";
