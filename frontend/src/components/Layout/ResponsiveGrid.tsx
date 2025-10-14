import React from 'react';
import { Grid, useTheme, useMediaQuery } from '@mui/material';

/**
 * Responsive grid props
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  spacing?: number;
  minItemWidth?: number;
}

/**
 * Responsive grid component that adapts to screen size
 * Automatically adjusts column count based on screen width and minimum item width
 */
export function ResponsiveGrid({ 
  children, 
  spacing = 2, 
  minItemWidth: _minItemWidth = 300 
}: ResponsiveGridProps) {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMd = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isLg = useMediaQuery(theme.breakpoints.between('lg', 'xl'));

  // Calculate grid columns based on screen size and minimum item width
  const getGridColumns = () => {
    if (isXs) return 12; // 1 column on extra small screens
    if (isSm) return 6;  // 2 columns on small screens
    if (isMd) return 4;  // 3 columns on medium screens
    if (isLg) return 3;  // 4 columns on large screens
    return 2;            // 6 columns on extra large screens
  };

  const gridColumns = getGridColumns();

  return (
    <Grid container spacing={spacing}>
      {React.Children.map(children, (child, index) => (
        <Grid item xs={gridColumns} key={index}>
          {child}
        </Grid>
      ))}
    </Grid>
  );
}