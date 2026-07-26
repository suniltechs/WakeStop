export type AppColors = {
  background: string;
  surface: string;
  gray: string;
  ink: string;
  muted: string;
  border: string;
  teal: string;
  tealDark: string;
  tealSoft: string;
  orange: string;
  orangeDark: string;
  orangeSoft: string;
  danger: string;
  alarm: string;
  alarmDark: string;
  white: string;
  black: string;
};

export const lightColors: AppColors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  gray: '#E5E5E5',
  ink: '#14213D',
  muted: 'rgba(20,33,61,0.72)',
  border: '#E5E5E5',
  teal: '#14213D',
  tealDark: '#000000',
  tealSoft: '#E5E5E5',
  orange: '#FCA311',
  orangeDark: '#000000',
  orangeSoft: '#E5E5E5',
  danger: '#000000',
  alarm: '#14213D',
  alarmDark: '#000000',
  white: '#FFFFFF',
  black: '#000000',
};

export const darkColors: AppColors = {
  background: '#000000',
  surface: '#14213D',
  gray: '#14213D',
  ink: '#FFFFFF',
  muted: 'rgba(229,229,229,0.72)',
  border: 'rgba(229,229,229,0.24)',
  teal: '#14213D',
  tealDark: '#FCA311',
  tealSoft: '#14213D',
  orange: '#FCA311',
  orangeDark: '#FFFFFF',
  orangeSoft: '#14213D',
  danger: '#FCA311',
  alarm: '#14213D',
  alarmDark: '#000000',
  white: '#FFFFFF',
  black: '#000000',
};

// Fixed brand palette for surfaces that intentionally do not follow app theme,
// such as the animated intro and arrival alarm.
export const colors = lightColors;
