import * as React from "react";
const ErrorIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width={16}
    height={16}
    x={0}
    y={0}
    viewBox="0 0 512 512"
    style={{
      enableBackground: "new 0 0 512 512",
    }}
    xmlSpace="preserve"
    className=""
    {...props}
  >
    <g>
      <path
        d="M256 512c141.385 0 256-114.615 256-256S397.385 0 256 0 0 114.615 0 256c.153 141.322 114.678 255.847 256 256zm-21.333-384c0-11.782 9.551-21.333 21.333-21.333 11.782 0 21.333 9.551 21.333 21.333v170.667c0 11.782-9.551 21.333-21.333 21.333-11.782 0-21.333-9.551-21.333-21.333V128zM256 384c11.782 0 21.333 9.551 21.333 21.333s-9.551 21.333-21.333 21.333c-11.782 0-21.333-9.551-21.333-21.333S244.218 384 256 384z"
        fill="#ffffff"
        opacity={1}
        data-original="#000000"
        className=""
      />
    </g>
  </svg>
);
export default ErrorIcon;
