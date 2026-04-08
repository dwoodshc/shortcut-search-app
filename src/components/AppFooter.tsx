/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * AppFooter.tsx — Static page footer. Displays the project name, copyright year, and
 * app version sourced directly from package.json.
 */
import React from 'react';
import pkg from '../../package.json';

export default function AppFooter(): React.JSX.Element {
  return (
    <footer className="App-footer">
      <p>© 2026 | Project D.A.V.E. (Dashboards Are Very Effective) | Ver {pkg.version}</p>
    </footer>
  );
}
