import { createTheme } from '@rneui/themed';

export const lightTheme = createTheme({
  lightColors: {
    primary: '#2196f3',
    secondary: '#ffd700',
    white: '#ffffff',
    black: '#000000',
    grey0: '#ffffff',
    grey1: '#f5f5f5',
    grey2: '#e0e0e0',
    grey3: '#757575',
    grey4: '#212121',
    grey5: '#121212',
  },
});

export const darkTheme = createTheme({
  mode: 'dark',
  darkColors: {
    primary: '#80cbc4',
    secondary: '#f48fb1',
    white: '#ffffff',
    black: '#121212',
    grey0: '#121212',
    grey1: '#212121',
    grey2: '#424242',
    grey3: '#757575',
    grey4: '#e0e0e0',
    grey5: '#f5f5f5',
  },
});
