// Colores semánticos compartidos para acciones que necesitan contraste explícito
// en los temas claro y oscuro de Envelope.
const interaction =
  'cursor-pointer transition-colors duration-200 focus-visible:ring-2 motion-reduce:transition-none'

export const actionButtonStyles = {
  neutral: `${interaction} border-[#9a8066] bg-white text-[#4f4a44] hover:border-[#7b634a] hover:bg-[#f0e6dc] hover:text-[#3d3935] focus-visible:ring-[#9a8066] dark:border-[#c3a583] dark:bg-[#303030] dark:text-[#f3f0e9] dark:hover:border-[#d8c0a3] dark:hover:bg-[#c3a583]/20 dark:hover:text-white dark:focus-visible:ring-[#d8c0a3]`,
  warning: `${interaction} border-amber-600 bg-amber-50 text-amber-950 hover:border-amber-700 hover:bg-amber-100 hover:text-amber-950 focus-visible:ring-amber-600 dark:border-amber-500 dark:bg-amber-950/60 dark:text-amber-100 dark:hover:border-amber-400 dark:hover:bg-amber-900/70 dark:hover:text-white dark:focus-visible:ring-amber-400`,
  success: `${interaction} border-emerald-700 bg-emerald-50 text-emerald-950 hover:border-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 focus-visible:ring-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:border-emerald-400 dark:hover:bg-emerald-900/70 dark:hover:text-white dark:focus-visible:ring-emerald-400`,
  danger: `${interaction} border-red-700 bg-red-50 text-red-950 hover:border-red-800 hover:bg-red-100 hover:text-red-950 focus-visible:ring-red-700 dark:border-red-500 dark:bg-red-950/60 dark:text-red-100 dark:hover:border-red-400 dark:hover:bg-red-900/70 dark:hover:text-white dark:focus-visible:ring-red-400`,
  warningSolid: `${interaction} border-amber-700 bg-amber-700 text-white hover:border-amber-800 hover:bg-amber-800 hover:text-white focus-visible:ring-amber-700 dark:border-amber-500 dark:bg-amber-600 dark:text-white dark:hover:border-amber-400 dark:hover:bg-amber-500 dark:hover:text-[#1a1a1a] dark:focus-visible:ring-amber-400`,
  successSolid: `${interaction} border-emerald-800 bg-emerald-800 text-white hover:border-emerald-900 hover:bg-emerald-900 hover:text-white focus-visible:ring-emerald-800 dark:border-emerald-500 dark:bg-emerald-600 dark:text-white dark:hover:border-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-[#052e16] dark:focus-visible:ring-emerald-400`,
  dangerSolid: `${interaction} border-red-800 bg-red-800 text-white hover:border-red-900 hover:bg-red-900 hover:text-white focus-visible:ring-red-800 dark:border-red-500 dark:bg-red-600 dark:text-white dark:hover:border-red-400 dark:hover:bg-red-500 dark:hover:text-white dark:focus-visible:ring-red-400`,
} as const
