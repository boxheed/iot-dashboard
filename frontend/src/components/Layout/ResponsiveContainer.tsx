import React from 'react';
import { Container, ContainerProps, useTheme, useMediaQuery } from '@mui/material';

/**
 * Responsive container props extending MUI Container props
 */
interface ResponsiveContainerProps extends Omit<ContainerProps, 'maxWidth'> {
  children: React.ReactNode;
  fullWidthOnMobile?: boolean;
}

/**
 * Responsive container component that adapts padding and max width based on screen size
 */
export function ResponsiveContainer({ 
  children, 
  fullWidthOnMobile = true,
  sx,
  ...props 
}: ResponsiveContainerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Determine max width based on screen size
  const getMaxWidth = (): ContainerProps['maxWidth'] => {
    if (isMobile && fullWidthOnMobile) return false;
    return 'xl';
  };

  // Responsive padding
  const responsivePadding = {
    px: { xs: 2, sm: 3, md: 4 },
    py: { xs: 2, sm: 3 },
  };

  return (
    <Container
      maxWidth={getMaxWidth()}
      sx={{
        ...responsivePadding,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Container>
  );
}