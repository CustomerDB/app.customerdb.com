import "./OnAirIcon.css";

import React from "react";

export default function OnAirIcon({ color }) {
  return (
    <div class="on-air-icon-container">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="18"
        viewBox="0 0 24 18"
      >
        <g fill={color} fill-rule="evenodd">
          <ellipse cx="12" cy="8.705" rx="3" ry="3" />
          <path
            id="on-air-out"
            d="M3.51471863.219669914C-1.17157288 4.90596141-1.17157288 12.5039412 3.51471863 17.1902327 3.80761184 17.4831259 4.28248558 17.4831259 4.5753788 17.1902327 4.86827202 16.8973394 4.86827202 16.4224657 4.5753788 16.1295725.474873734 12.0290674.474873734 5.38083515 4.5753788 1.28033009 4.86827202.987436867 4.86827202.512563133 4.5753788.219669914 4.28248558-.0732233047 3.80761184-.0732233047 3.51471863.219669914zM20.4852814 17.1902327C25.1715729 12.5039412 25.1715729 4.90596141 20.4852814.219669914 20.1923882-.0732233047 19.7175144-.0732233047 19.4246212.219669914 19.131728.512563133 19.131728.987436867 19.4246212 1.28033009 23.5251263 5.38083515 23.5251263 12.0290674 19.4246212 16.1295725 19.131728 16.4224657 19.131728 16.8973394 19.4246212 17.1902327 19.7175144 17.4831259 20.1923882 17.4831259 20.4852814 17.1902327z"
          />
          <path
            id="on-air-in"
            d="M17.3033009 14.0082521C18.7217837 12.5897693 19.4928584 10.6983839 19.4999509 8.73215792 19.507111 6.74721082 18.7352286 4.8335782 17.3033009 3.40165043 17.0104076 3.10875721 16.5355339 3.10875721 16.2426407 3.40165043 15.9497475 3.69454365 15.9497475 4.16941738 16.2426407 4.4623106 17.3890249 5.6086948 18.0056933 7.13752465 17.9999607 8.72674718 17.9942823 10.30094 17.3782748 11.8119579 16.2426407 12.947592 15.9497475 13.2404852 15.9497475 13.7153589 16.2426407 14.0082521 16.5355339 14.3011454 17.0104076 14.3011454 17.3033009 14.0082521zM6.69669914 3.40165043C3.76776695 6.33058262 3.76776695 11.07932 6.69669914 14.0082521 6.98959236 14.3011454 7.46446609 14.3011454 7.75735931 14.0082521 8.05025253 13.7153589 8.05025253 13.2404852 7.75735931 12.947592 5.41421356 10.6044462 5.41421356 6.80545635 7.75735931 4.4623106 8.05025253 4.16941738 8.05025253 3.69454365 7.75735931 3.40165043 7.46446609 3.10875721 6.98959236 3.10875721 6.69669914 3.40165043z"
          />
        </g>
      </svg>
    </div>
  );
}
