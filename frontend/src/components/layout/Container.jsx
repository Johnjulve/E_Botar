/**
 * Container Component
 * Wrapper for page content with consistent padding
 */

import React from 'react';
import { Container as BootstrapContainer } from 'react-bootstrap';

const Container = ({ children, fluid = true, className = '', ...props }) => {
  return (
    <BootstrapContainer fluid={fluid} className={`py-4 px-4 px-md-5 ${className}`} {...props}>
      {children}
    </BootstrapContainer>
  );
};

export default Container;

