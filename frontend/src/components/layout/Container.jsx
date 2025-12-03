/**
 * Container Component
 * Wrapper for page content with consistent padding
 */

import React from 'react';
import { Container as BootstrapContainer } from 'react-bootstrap';

const Container = ({ children, fluid = false, className = '', ...props }) => {
  return (
    <BootstrapContainer fluid={fluid} className={`py-4 ${className}`} {...props}>
      {children}
    </BootstrapContainer>
  );
};

export default Container;

