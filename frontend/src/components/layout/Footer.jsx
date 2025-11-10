/**
 * Footer Component
 * Site footer with copyright and links
 */

import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer mt-5">
      <div className="container">
        <div className="footer-content">
          <div className="row">
            <div className="col-md-4 mb-4 mb-md-0">
              <h5>E-Botar</h5>
              <p>
                Empowering democratic decision-making through secure and transparent voting systems.
              </p>
            </div>
            <div className="col-md-4 mb-4 mb-md-0">
              <h5>Quick Links</h5>
              <p className="mb-2">
                <Link to="/admin">Dashboard</Link>
              </p>
              <p className="mb-2">
                <Link to="/elections">School Elections</Link>
              </p>
              <p className="mb-0">
                <Link to="/candidates">Candidates</Link>
              </p>
            </div>
            <div className="col-md-4">
              <h5>About</h5>
              <p>
                A comprehensive voting platform designed for educational institutions and community engagement.
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="mb-0">
              &copy; {currentYear} E-Botar Voting System. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

