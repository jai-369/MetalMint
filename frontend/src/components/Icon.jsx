const iconPaths = {
  dashboard: (
    <path d="M4 5.5h6.5v6.5H4zM13.5 5.5H20v4H13.5zM13.5 12.5H20v6H13.5zM4 15h6.5v3.5H4z" />
  ),
  products: (
    <>
      <path d="M4.5 7.5 12 4l7.5 3.5v9L12 20l-7.5-3.5z" />
      <path d="M12 4v16M4.5 7.5 12 11l7.5-3.5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4.5 4.5" />
    </>
  ),
  scan: (
    <>
      <path d="M7 4.5H5.5A1.5 1.5 0 0 0 4 6v1.5M17 4.5h1.5A1.5 1.5 0 0 1 20 6v1.5M20 17v1.5a1.5 1.5 0 0 1-1.5 1.5H17M7 20H5.5A1.5 1.5 0 0 1 4 18.5V17" />
      <path d="M8 9.5h8M8 12h5M8 14.5h8" />
    </>
  ),
  stock: (
    <>
      <path d="M5 8.5h14v10H5z" />
      <path d="M8 8.5V6.75A2.75 2.75 0 0 1 10.75 4h2.5A2.75 2.75 0 0 1 16 6.75V8.5M9 12h6" />
    </>
  ),
  sales: (
    <>
      <path d="M6 4.5h8l4 4v11H6z" />
      <path d="M14 4.5V9h4M9 13h6M9 16h6" />
    </>
  ),
  repair: (
    <>
      <path d="m14.5 6.5 3 3" />
      <path d="m5 19 4.5-1 9-9a2.12 2.12 0 1 0-3-3l-9 9z" />
    </>
  ),
  types: (
    <>
      <path d="M5 6h14M5 12h14M5 18h14" />
      <path d="M8 4v4M12 10v4M16 16v4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M4.5 18a4.5 4.5 0 0 1 9 0M16.5 9.5a2.5 2.5 0 1 0 0-5M18 18a4 4 0 0 0-3-3.85" />
    </>
  ),
  more: (
    <>
      <circle cx="6.5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="17.5" cy="12" r="1.5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  qr: (
    <>
      <path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5z" />
      <path d="M15 14h1.5v1.5H15zM18 14h1v5h-5v-1.5h3.5V14zM12.5 12.5h2v2h-2z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v2.25M12 18.25v2.25M3.5 12h2.25M18.25 12h2.25M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6" />
    </>
  ),
  moon: <path d="M19 13.25A7.25 7.25 0 1 1 10.75 5a5.75 5.75 0 0 0 8.25 8.25Z" />,
  logout: (
    <>
      <path d="M9.5 5.5H6.25A1.75 1.75 0 0 0 4.5 7.25v9.5c0 .97.78 1.75 1.75 1.75H9.5" />
      <path d="M13 8.5 19 12l-6 3.5M19 12H9.5" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6.5 19 12l-6 5.5" />,
  print: (
    <>
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
    </>
  ),
  filter: (
    <>
      <path d="M4.5 6h15M7.5 12h9M10.5 18h3" />
    </>
  ),
};

function Icon({ className = "", name, size = 18, strokeWidth = 1.9, title }) {
  const content = iconPaths[name];

  if (!content) {
    return null;
  }

  return (
    <svg
      aria-hidden={title ? undefined : "true"}
      className={`ui-icon ${className}`.trim()}
      fill="none"
      height={size}
      role={title ? "img" : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
    >
      {title ? <title>{title}</title> : null}
      {content}
    </svg>
  );
}

export default Icon;
