/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 */

export const ResetIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[14px] h-[14px] align-middle inline-block">
    <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.95-2.05L6.64 18.36A8.955 8.955 0 0 0 13 21a9 9 0 0 0 0-18z"/>
  </svg>
);

export const TargetIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] align-middle inline-block">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const TargetActiveIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-[14px] h-[14px] align-middle inline-block">
    <circle cx="12" cy="12" r="11" fill="#dc2626" />
    <circle cx="12" cy="12" r="8" fill="white" />
    <circle cx="12" cy="12" r="5" fill="#dc2626" />
    <circle cx="12" cy="12" r="2" fill="white" />
    {/* Dart shaft from upper-right into the bullseye */}
    <line x1="22" y1="2" x2="13" y2="11" stroke="#1f2937" strokeWidth="1.6" strokeLinecap="round" />
    {/* Dart tip embedded in the bullseye */}
    <circle cx="12.5" cy="11.5" r="0.9" fill="#1f2937" />
    {/* Dart flight (fletching) at the back end */}
    <polygon points="22,2 20,1 21.5,3.5" fill="#fbbf24" stroke="#1f2937" strokeWidth="0.5" strokeLinejoin="round" />
    <polygon points="22,2 23,4 20.5,2.5" fill="#fbbf24" stroke="#1f2937" strokeWidth="0.5" strokeLinejoin="round" />
  </svg>
);

export const CheckCircleIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] align-middle inline-block">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12l3 3 5-6" />
  </svg>
);

export const BlockedIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] align-middle inline-block">
    <circle cx="12" cy="12" r="10" />
    <line x1="5" y1="5" x2="19" y2="19" />
  </svg>
);

export const UserIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] align-middle inline-block">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
  </svg>
);

export const HashIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] align-middle inline-block">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

export const UserActiveIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-[14px] h-[14px] align-middle inline-block">
    <circle cx="12" cy="8" r="4" fill="#494BCB" />
    <path d="M4 21c0-4 4-7 8-7s8 3 8 7z" fill="#494BCB" />
  </svg>
);

export const HashActiveIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="#b45309" strokeWidth="3" strokeLinecap="round" className="w-[14px] h-[14px] align-middle inline-block">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

export const KanbanIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] align-middle inline-block">
    <rect x="3" y="3" width="5" height="14" rx="1" />
    <rect x="10" y="3" width="5" height="8" rx="1" />
    <rect x="17" y="3" width="4" height="11" rx="1" />
  </svg>
);

export const PieIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] align-middle inline-block">
    <path d="M21 12a9 9 0 1 1-9-9v9z" />
    <path d="M22 12a10 10 0 0 0-10-10v10z" />
  </svg>
);

export const ChartIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] align-middle inline-block">
    <path d="M3 3v18h18" />
    <rect x="7" y="13" width="3" height="5" />
    <rect x="12" y="9" width="3" height="9" />
    <rect x="17" y="5" width="3" height="13" />
  </svg>
);

export const PullRequestIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] align-middle inline-block">
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <line x1="6" y1="8.5" x2="6" y2="15.5" />
    <path d="M18 15.5 V11 a3 3 0 0 0 -3 -3 H10" />
    <polyline points="12,5 9,8 12,11" />
  </svg>
);

export const BarChartIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] align-middle inline-block">
    <line x1="3" y1="21" x2="21" y2="21" />
    <rect x="5" y="11" width="3" height="10" />
    <rect x="10" y="7" width="3" height="14" />
    <rect x="15" y="3" width="3" height="18" />
  </svg>
);

export const UsersIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] align-middle inline-block">
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2 21c0-3.5 3.5-6 7-6s7 2.5 7 6" />
    <circle cx="17" cy="7" r="2.5" />
    <path d="M16 14c3 0 6 1.8 6 5" />
  </svg>
);

export const TicketIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] align-middle inline-block">
    <path d="M3 9 a2 2 0 0 1 2 -2 h14 a2 2 0 0 1 2 2 v2 a2 2 0 0 0 0 4 v2 a2 2 0 0 1 -2 2 h-14 a2 2 0 0 1 -2 -2 v-2 a2 2 0 0 0 0 -4 z" />
    <line x1="12" y1="7" x2="12" y2="9" />
    <line x1="12" y1="11" x2="12" y2="13" />
    <line x1="12" y1="15" x2="12" y2="17" />
  </svg>
);

export const LinkIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] align-middle inline-block">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

export const ClipboardCopyIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] align-middle inline-block">
    <rect x="9" y="2" width="6" height="4" rx="1" />
    <path d="M8 4H6a2 2 0 0 0 -2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2V6a2 2 0 0 0 -2 -2h-2" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);
